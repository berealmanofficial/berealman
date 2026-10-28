/**
 * ⚠️ কোর্স স্টোর — persistence স্তর
 * ------------------------------------------------------------------
 * সততার ঘোষণা: এই প্রজেক্টে এখনো কোনো ডেটাবেস/ব্যাকএন্ড নেই (Phase 2-এ
 * Supabase যুক্ত হবে)। তাই অ্যাডমিনের সব পরিবর্তন এবং কেনা-কোর্স এন্টাইটেলমেন্ট
 * ব্রাউজারের localStorage-এ সেভ হয় — রিলোড/লগআউটের পরেও টিকে থাকে, কিন্তু
 * ডিভাইসভেদে সিঙ্ক হয় না। সত্যিকারের সার্ভার-সাইড স্টোরেজ পাওয়া মাত্র এই
 * ফাংশনগুলোর ভেতরে ব্যাকএন্ড কল বসাবে — পেজ কোড বদলাতে হবে না।
 * ------------------------------------------------------------------
 */

import { seedCourses, newLesson, newModule, type Course, type Lesson } from "../data/courses";
import { extractYouTubeId } from "./youtube";

const COURSES_KEY = "brm-courses-admin-v1";
const ENTITLEMENTS_KEY = "brm-course-entitlements-v1";
/** কোর্স স্টোরের রিসিশন — UI ফ্রেশ লোডের জন্য */
const VERSION_KEY = "brm-courses-version";

export type Entitlement = {
  courseSlug: string;
  /** লোকাল প্রোফাইলের ইমেইল (auth ব্যাকএন্ড Phase 2-এ আসল ইউজার ID হবে) */
  email: string | null;
  grantedAt: string;
};

/* ───────────── কোর্স CRUD ───────────── */

export function loadCourses(): Course[] {
  try {
    const raw = localStorage.getItem(COURSES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Course[];
      if (Array.isArray(parsed) && parsed.length >= 0) return parsed;
    }
  } catch {
    /* দুর্বল ডেটা — seed ফিরিয়ে দাও */
  }
  return seedCourses;
}

export function saveCourses(courses: Course[]): void {
  localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
  localStorage.setItem(VERSION_KEY, Date.now().toString());
}

/** অ্যাডমিনের সব পরিবর্তন মুছে seed-এ ফিরে যাওয়া (ভাঙা টেস্ট রিসেটের জন্য) */
export function resetCourses(): void {
  localStorage.removeItem(COURSES_KEY);
  localStorage.setItem(VERSION_KEY, Date.now().toString());
}

export function updateCourse(slug: string, mutate: (c: Course) => void): void {
  const courses = loadCourses();
  const course = courses.find((c) => c.slug === slug);
  if (!course) return;
  mutate(course);
  saveCourses(courses);
}

/* ───────────── কোর্স তৈরি/মুছে (অ্যাডমিন) ───────────── */

export function createCourse(partial: {
  title: string;
  description: string;
  price: number;
  cover: string | null;
  objectives: string[];
  audience: string;
}): Course | null {
  const courses = loadCourses();
  const base = partial.title.trim() || "নতুন কোর্স";
  let slug = slugify(base) || `course-${courses.length + 1}`;
  while (courses.some((c) => c.slug === slug)) slug = `${slug}-2`;
  const m = newModule("মডিউল ১", 1);
  const course: Course = {
    slug,
    title: base,
    description: partial.description,
    cover: partial.cover,
    objectives: partial.objectives,
    audience: partial.audience,
    price: partial.price,
    published: false,
    modules: [m],
    lessons: [],
  };
  courses.push(course);
  saveCourses(courses);
  return course;
}

export function deleteCourse(slug: string): void {
  saveCourses(loadCourses().filter((c) => c.slug !== slug));
}

/* ───────────── মডিউল হেল্পার (অ্যাডমিন) ───────────── */

export function addModule(slug: string, title: string): void {
  updateCourse(slug, (c) => {
    c.modules.push(newModule(title, c.modules.length + 1));
    c.modules.sort((a, b) => a.order - b.order);
  });
}

export function renameModule(slug: string, moduleId: string, title: string): void {
  updateCourse(slug, (c) => {
    const m = c.modules.find((x) => x.id === moduleId);
    if (m) m.title = title;
  });
}

export function deleteModule(slug: string, moduleId: string): void {
  updateCourse(slug, (c) => {
    c.modules = c.modules.filter((m) => m.id !== moduleId);
    c.lessons = c.lessons.filter((l) => l.moduleId !== moduleId);
    renumber(c.modules);
  });
}

export function moveModule(slug: string, moduleId: string, dir: -1 | 1): void {
  updateCourse(slug, (c) => {
    const sorted = [...c.modules].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((m) => m.id === moduleId);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= sorted.length) return;
    [sorted[idx].order, sorted[j].order] = [sorted[j].order, sorted[idx].order];
    c.modules.sort((a, b) => a.order - b.order);
  });
}

/* ───────────── লেসন হেল্পার (অ্যাডমিন) — ইউটিউব লিংক ম্যানেজমেন্ট ───────────── */

export function addLesson(
  slug: string,
  data: {
    moduleId: string;
    title: string;
    description: string;
    youtubeUrl: string | null;
    customThumbnail: string | null;
    published: boolean;
  },
): Lesson | null {
  const videoId = data.youtubeUrl?.trim() ? extractYouTubeId(data.youtubeUrl) : null;
  if (data.youtubeUrl?.trim() && !videoId) return null; // কলার UI-এ বাংলা এরর দেখাবে
  let saved: Lesson | null = null;
  updateCourse(slug, (c) => {
    const l = newLesson(data.moduleId, data.title || "নতুন লেসন", c.lessons.length + 1);
    l.description = data.description;
    l.youtubeUrl = data.youtubeUrl?.trim() || null;
    l.videoId = videoId;
    l.customThumbnail = data.customThumbnail?.trim() || null;
    l.published = data.published;
    c.lessons.push(l);
    saved = l;
  });
  return saved;
}

export function updateLesson(
  slug: string,
  lessonId: string,
  data: {
    moduleId: string;
    title: string;
    description: string;
    youtubeUrl: string | null;
    customThumbnail: string | null;
    published: boolean;
  },
): boolean {
  const videoId = data.youtubeUrl?.trim() ? extractYouTubeId(data.youtubeUrl) : null;
  if (data.youtubeUrl?.trim() && !videoId) return false;
  updateCourse(slug, (c) => {
    const l = c.lessons.find((x) => x.id === lessonId);
    if (!l) return;
    l.moduleId = data.moduleId;
    l.title = data.title;
    l.description = data.description;
    l.youtubeUrl = data.youtubeUrl?.trim() || null;
    l.videoId = videoId;
    l.customThumbnail = data.customThumbnail?.trim() || null;
    l.published = data.published;
  });
  return true;
}

export function deleteLesson(slug: string, lessonId: string): void {
  updateCourse(slug, (c) => {
    c.lessons = c.lessons.filter((l) => l.id !== lessonId);
  });
}

export function moveLesson(slug: string, lessonId: string, dir: -1 | 1): void {
  updateCourse(slug, (c) => {
    const lesson = c.lessons.find((x) => x.id === lessonId);
    if (!lesson) return;
    // একই মডিউলের ভাইদের মধ্যে order swap — কোর্সের order ইউনিক থাকে
    const siblings = c.lessons
      .filter((l) => l.moduleId === lesson.moduleId)
      .sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((l) => l.id === lessonId);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= siblings.length) return;
    [siblings[idx].order, siblings[j].order] = [siblings[j].order, siblings[idx].order];
  });
}

/* ───────────── এন্টাইটেলমেন্ট ("আমার কেনা কোর্স") ───────────── */

export function loadEntitlements(): Entitlement[] {
  try {
    const raw = localStorage.getItem(ENTITLEMENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Entitlement[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* দুর্বল ডেটা */
  }
  return [];
}

export function hasEntitlement(courseSlug: string, email: string | null): boolean {
  return loadEntitlements().some(
    (e) => e.courseSlug === courseSlug && (e.email === null || e.email === email),
  );
}

/**
 * সতর্কতা: এন্টাইটেলমেন্ট রেকর্ড করা হয় শুধু পেমেন্ট অ্যাপ্রুভালের পরে
 * (Phase পরবর্তী)। কেনার বাটন চাপলে কোনো এন্টাইটেলমেন্ট তৈরি হয় না — ভুয়া
 * পেমেন্ট-সফল অবস্থা দেখানোও হয় না। অ্যাডমিন প্যানেলের "টেস্ট এন্টাইটেলমেন্ট"
 * বাটন শুধু অ্যাক্সেস-যাচাইনির জন্য, স্পষ্টভাবে লেবেল করা।
 */
export function grantTestEntitlement(courseSlug: string, email: string | null): void {
  const list = loadEntitlements().filter(
    (e) => !(e.courseSlug === courseSlug && e.email === email),
  );
  list.push({ courseSlug, email, grantedAt: new Date().toISOString() });
  localStorage.setItem(ENTITLEMENTS_KEY, JSON.stringify(list));
}

export function revokeTestEntitlement(courseSlug: string, email: string | null): void {
  const list = loadEntitlements().filter(
    (e) => !(e.courseSlug === courseSlug && e.email === email),
  );
  localStorage.setItem(ENTITLEMENTS_KEY, JSON.stringify(list));
}

/* ───────────── ইউটিক ───────────── */

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function renumber<T extends { order: number }>(items: T[]): void {
  items
    .sort((a, b) => a.order - b.order)
    .forEach((it, i) => {
      it.order = i + 1;
    });
}

export function decrementCourseVersion(): void {
  localStorage.setItem(VERSION_KEY, Date.now().toString());
}

export { VERSION_KEY };
