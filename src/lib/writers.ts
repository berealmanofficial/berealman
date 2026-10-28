/**
 * লেখক আবেদন ও আর্টিকেল স্টোর
 * ------------------------------------------------------------------
 * ⚠️ সততার ঘোষণা (গুরুত্বপূর্ণ):
 *  - প্রজেক্টে এখনো কোনো ব্যাকএন্ড/ডেটাবেস/ইমেইল সার্ভিস নেই। তাই লেখকের আবেদন,
 *    লেখার নমুনা ও আর্টিকেল এই ডিভাইসের localStorage-এ সেভ হয় (`brm-writers-v1`) —
 *    রিলোডে টিকে থাকে, কিন্তু অন্য ডিভাইস/ব্রাউজারে দেখা যাবে না এবং
 *    এটি সার্ভার-সাইড অথরাইজেশন নয়।
 *  - অ্যাডমিন অনুমোদন/প্রত্যাখ্যান বিদ্যমান client-side অ্যাডমিন গেটের পিছনে
 *    (src/lib/adminGate.ts — কোর্স ও পেমেন্ট অ্যাডমিনে ব্যবহৃত একই গেট)।
 *    সত্যিকারের নিরাপত্তা auth ব্যাকএন্ড (Phase 2) + সার্ভার-সাইড চেকে আসবে।
 *  - ইমেইল নোটিফিকেশন (অনুমোদন/প্রত্যাখ্যান) পাঠানোর কোনো সার্ভিস কনফিগার হয়নি —
 *    তাই রিজেকশনের কারণ এখন শুধু প্রোফাইলে দেখানো হয়; ইমেইলে নয়।
 *  - কেউ localStorage বদলে ফেললে ক্লায়েন্ট-সাইডে ঠেকানোর উপায় নেই —
 *    তবে প্রকাশিত আর্টিকেল খসড়া/রিভিউয়ের মধ্যে অন্য কাউকে কখনোই দেখানো হয় না,
 *    এবং অনুমোদনের আগে কোনো আর্টিকেল সর্বজনীন পাতায় কখনোই যায় না।
 * ------------------------------------------------------------------
 */

import { useSyncExternalStore } from "react";
import { sampleCover } from "../data/sample";
import type { Article } from "../data/types";

/* ───────────────── টাইপ ───────────────── */

export type ApplicationStatus = "submitted" | "under-review" | "approved" | "rejected";

export type WriterApplication = {
  id: string;
  accountEmail: string;
  fullName: string;
  displayName: string;
  contactEmail: string;
  mobile: string;
  /** data URL — ফর্মে আপলোড হলে; খালি হতে পারে */
  avatar: string;
  bio: string;
  over18: boolean;
  education: string;
  institution: string;
  profession: string;
  workplace: string;
  experience: string;
  publishedLink: string;
  expertise: string;
  /** বিদ্যমান ক্যাটেগরি সিস্টেমের slug — নতুন ক্যাটেগরি তৈরি করা হয় না */
  categorySlug: string;
  facebookUrl: string;
  extraInfo: string;
  status: ApplicationStatus;
  submittedAt: string;
  updatedAt: string;
  /** অ্যাডমিন প্রত্যাখ্যান/নোট — সাধারণ ইউজার নিজের আবেদনেই দেখবে, তালিকা-সাধারণ নয় */
  reviewNote?: string | null;
  /** স্ট্যাটাস পরিবর্তনের ইতিহাস — ইউযারও অ্যাডমিনও দেখতে পারে */
  history: { at: string; status: ApplicationStatus; note?: string }[];
};

export type WritingSample = {
  applicationId: string;
  title: string;
  body: string;
  /** সর্বোচ্চ ৪টি ছবি (data URL) */
  images: string[];
  /** null = সেভ-করা খসড়া; তারিখ থাকলে জমা সম্পন্ন */
  submittedAt: string | null;
  updatedAt: string;
};

export type ArticleStatus =
  | "draft"
  | "pending"
  | "changes-requested"
  | "published"
  | "rejected";

export type WriterArticle = {
  id: string;
  /** সর্বজনীন পাঠের স্থিতিস্থ স্লাগ: writer-<id> */
  slug: string;
  accountEmail: string;
  authorDisplayName: string;
  title: string;
  /** data URL — কভার দিলে সেটাই, না দিলে sampleCover ফলব্যাক */
  cover: string;
  /** বিদ্যমান ক্যাটেগরি slug সিস্টেমের */
  categorySlug: string;
  body: string;
  images: string[];
  status: ArticleStatus;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  publishedAt?: string | null;
};

export type WriterStore = {
  applications: WriterApplication[];
  samples: WritingSample[];
  articles: WriterArticle[];
};

const EMPTY: WriterStore = { applications: [], samples: [], articles: [] };
const KEY = "brm-writers-v1";

/* ───────────────── রিয়াক্টিভ স্টোর ───────────────── */

let cache: WriterStore | null = null;
const listeners = new Set<() => void>();

function normalize(raw: unknown): WriterStore {
  const p = (raw ?? {}) as Partial<WriterStore>;
  return {
    applications: Array.isArray(p.applications) ? (p.applications as WriterApplication[]) : [],
    samples: Array.isArray(p.samples) ? (p.samples as WritingSample[]) : [],
    articles: Array.isArray(p.articles) ? (p.articles as WriterArticle[]) : [],
  };
}

export function loadWriterStore(): WriterStore {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) cache = normalize(JSON.parse(raw));
  } catch {
    /* দুর্বল ডেটা — খালি স্টোর */
  }
  if (!cache) cache = EMPTY;
  return cache;
}

function updateStore(mutate: (s: WriterStore) => WriterStore) {
  const current = loadWriterStore();
  cache = mutate({ applications: [...current.applications], samples: [...current.samples], articles: [...current.articles] });
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* কোটা/প্রাইভেট মোড — সেভ না হলেও রানটাইম আটকানো হয় না */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useWriters(): WriterStore {
  return useSyncExternalStore(
    subscribe,
    () => loadWriterStore(),
    () => EMPTY,
  );
}

/* ───────────────── হেল্পার ───────────────── */

function nowIso() {
  return new Date().toISOString();
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export const SAMPLE_MIN_WORDS = 500;
export const MAX_SAMPLE_IMAGES = 4;
export const MAX_ARTICLE_IMAGES = 4;

/** ইমেজ হেল্পার: ফাইল → হ্যাশবিহীন data URL (সাইজ কমাতে ক্যানভাসে রিসাইজ) */
export function fileToDataUrl(file: File, maxDim = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      reject(new Error("শুধু JPG, PNG বা WebP ছবি চলবে।"));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error("ছবি ৮ MB-এর বেশি হলে চলবে না — ছোট ছবি দাও।"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("ছবি পড়া যায়নি — আবার চেষ্টা করো।"));
    reader.onload = () => {
      const src = String(reader.result ?? "");
      const img = new Image();
      img.onerror = () => resolve(src);
      img.onload = () => {
        try {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          if (scale >= 1) {
            resolve(src);
            return;
          }
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(src);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        } catch {
          resolve(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

/* ───────────────── আবেদন ───────────────── */

/** ইউজারের সবচেয়ে সাম্প্রতিক আবেদন (approved বা নতুন যেটা আছে) */
export function applicationForEmail(email: string): WriterApplication | undefined {
  return loadWriterStore()
    .applications.filter((a) => a.accountEmail === email)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
}

/** আবেদন "ফাইনাল ডিসিশনের অপেক্ষায়" কি না — এই সময়ে দ্বিতীয় আবেদন বন্ধ */
export function hasActiveApplication(email: string): boolean {
  const app = applicationForEmail(email);
  return !!app && (app.status === "submitted" || app.status === "under-review");
}

export function isApprovedWriter(email: string): boolean {
  return applicationForEmail(email)?.status === "approved";
}

export type ApplicationInput = {
  fullName: string;
  displayName: string;
  contactEmail: string;
  mobile: string;
  avatar: string;
  bio: string;
  over18: boolean;
  education: string;
  institution: string;
  profession: string;
  workplace: string;
  experience: string;
  publishedLink: string;
  expertise: string;
  categorySlug: string;
  facebookUrl: string;
  extraInfo: string;
};

/**
 * আবেদন সেভ (ফর্ম স্টেপ)। এক অ্যাকাউন্টে একটিই চলমান আবেদন রাখা হয়;
 * আবেদন "আওয়াইটিং ডিসিশন" অবস্থায় থাকলে দ্বিতীয় আবেদন নিষিদ্ধ।
 */
export function saveApplication(email: string, input: ApplicationInput): WriterApplication {
  const existing = applicationForEmail(email);
  const updatedAt = nowIso();

  if (existing) {
    const next: WriterApplication = {
      ...existing,
      ...input,
      accountEmail: email,
      updatedAt,
    };
    /** প্রত্যাখ্যাত আবেদন সম্পাদনা করে জমা দিলে আবার "জমা হয়েছে" স্থিতিতে ফিরে যায় (ইতিহাস রেখে) */
    if (existing.status === "rejected") {
      next.status = "submitted";
      next.history = [...existing.history, { at: updatedAt, status: "submitted" as const }];
    }
    updateStore((s) => ({
      ...s,
      applications: s.applications.map((a) => (a.id === next.id ? next : a)),
    }));
    return next;
  }

  const app: WriterApplication = {
    id: newId("app"),
    accountEmail: email,
    ...input,
    status: "submitted",
    submittedAt: updatedAt,
    updatedAt,
    reviewNote: null,
    history: [{ at: updatedAt, status: "submitted" }],
  };
  updateStore((s) => ({ ...s, applications: [app, ...s.applications] }));
  return app;
}

/** অ্যাডমিন: স্ট্যাটাস বদল + ইতিহাস রেকর্ড (শুধু অ্যাডমিন গেটের পিছনে কল হওয়া উচিত) */
export function setApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
  note?: string | null,
) {
  updateStore((s) => ({
    ...s,
    applications: s.applications.map((a) =>
      a.id === applicationId
        ? {
            ...a,
            status,
            reviewNote: note ?? a.reviewNote ?? null,
            updatedAt: nowIso(),
            history: [...a.history, { at: nowIso(), status, note: note ?? undefined }],
          }
        : a,
    ),
  }));
}

/* ───────────────── লেখার নমুনা ───────────────── */

export function sampleForApplication(applicationId: string): WritingSample | undefined {
  return loadWriterStore().samples.find((s) => s.applicationId === applicationId);
}

export function upsertSample(
  applicationId: string,
  input: { title: string; body: string; images: string[]; submit?: boolean },
): WritingSample {
  const existing = sampleForApplication(applicationId);
  const updatedAt = nowIso();
  const next: WritingSample = existing
    ? {
        ...existing,
        title: input.title,
        body: input.body,
        images: input.images,
        submittedAt: input.submit ? existing.submittedAt ?? updatedAt : existing.submittedAt,
        updatedAt,
      }
    : {
        applicationId,
        title: input.title,
        body: input.body,
        images: input.images,
        submittedAt: input.submit ? updatedAt : null,
        updatedAt,
      };
  updateStore((s) => ({
    ...s,
    samples: existing
      ? s.samples.map((x) => (x.applicationId === applicationId ? next : x))
      : [...s.samples, next],
  }));
  return next;
}

/* ───────────────── লেখকের আর্টিকেল ───────────────── */

export function articlesForEmail(email: string): WriterArticle[] {
  return loadWriterStore()
    .articles.filter((a) => a.accountEmail === email)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function articleById(id: string): WriterArticle | undefined {
  return loadWriterStore().articles.find((a) => a.id === id);
}

/** সর্বজনীন পাতায় (স্ট্যাটাস "published") — এটিই প্রকাশ */
export function publishedWriterArticles(): WriterArticle[] {
  return loadWriterStore().articles
    .filter((a) => a.status === "published")
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

export function newArticle(email: string, authorDisplayName: string): WriterArticle {
  const id = newId("art");
  const article: WriterArticle = {
    id,
    slug: `writer-${id}`,
    accountEmail: email,
    authorDisplayName,
    title: "",
    cover: "",
    categorySlug: "",
    body: "",
    images: [],
    status: "draft",
    reviewNote: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    submittedAt: null,
    publishedAt: null,
  };
  updateStore((s) => ({ ...s, articles: [article, ...s.articles] }));
  return article;
}

export type ArticleInput = {
  title: string;
  cover: string;
  categorySlug: string;
  body: string;
  images: string[];
};

/** সম্পাদনার স্থিতি — published ও pending লক থাকে */
export function articleEditableByStatus(status: ArticleStatus): boolean {
  return status === "draft" || status === "changes-requested" || status === "rejected";
}

export function saveArticle(
  id: string,
  input: ArticleInput,
  action: "draft" | "submit",
): WriterArticle | undefined {
  const prev = articleById(id);
  if (!prev) return undefined;

  const updatedAt = nowIso();
  const next: WriterArticle = {
    ...prev,
    ...input,
    updatedAt,
  };
  if (action === "submit") {
    next.status = "pending";
    next.submittedAt = updatedAt;
    next.reviewNote = null;
    next.publishedAt = null;
  }

  updateStore((s) => ({
    ...s,
    articles: s.articles.map((a) => (a.id === id ? next : a)),
  }));
  return next;
}

/**
 * অ্যাডমিন: রিভিউ ফল — প্রকাশ / পরিবর্তন চাও / প্রত্যাখ্যান।
 * প্রকাশ না হওয়া পর্যন্ত আর্টিকেল সর্বজনীন পাতায় যায় না।
 */
export function reviewArticle(
  id: string,
  decision: "published" | "changes-requested" | "rejected",
  note?: string | null,
) {
  updateStore((s) => ({
    ...s,
    articles: s.articles.map((a) =>
      a.id === id
        ? {
            ...a,
            status: decision,
            reviewNote: note ?? null,
            publishedAt: decision === "published" ? nowIso() : null,
            updatedAt: nowIso(),
          }
        : a,
    ),
  }));
}

/* ───────────────── সর্বজনীন ভিউয়ের রূপান্তর ───────────────── */

/** প্রকাশিত লেখকের আর্টিকেল → বিদ্যমান Article শেপ (একই সাইট টাইপোগ্রাফিতে রেন্ডার হয়) */
export function writerArticleAsArticle(w: WriterArticle): Article {
  const words = wordCount(w.body);
  const paragraphs = w.body
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    slug: w.slug,
    title: w.title,
    excerpt: paragraphs[0]?.slice(0, 160) ?? "",
    categorySlug: w.categorySlug,
    tags: [],
    author: w.authorDisplayName,
    publishedAt: (w.publishedAt ?? w.updatedAt).slice(0, 10),
    readingTimeMin: Math.max(1, Math.round(words / 180)),
    access: "free",
    cover: w.cover || w.images[0] || sampleCover(w.slug),
    body: paragraphs.map((p) => p.replaceAll(/\r?\n/g, " ")),
  };
}

/* ───────────────── লেবেল ───────────────── */

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  submitted: "জমা হয়েছে — যাচাইয়ের অপেক্ষায়",
  "under-review": "রিভিউ চলছে",
  approved: "অনুমোদিত",
  rejected: "প্রত্যাখ্যাত",
};

export const ARTICLE_STATUS_LABEL: Record<ArticleStatus, string> = {
  draft: "খসড়া",
  pending: "রিভিউয়ের অপেক্ষায়",
  "changes-requested": "পরিবর্তন প্রয়োজন",
  published: "প্রকাশিত",
  rejected: "প্রত্যাখ্যাত",
};

export const WRITERS_LIMITATION_BN =
  "লেখকের আবেদন, নমুনা ও আর্টিকেল এই ব্রাউজারে (localStorage) সেভ হয় — সার্ভার-সাইড auth/ডেটাবেস ও ইমেইল সার্ভিস এখনো যুক্ত হয়নি, তাই অন্য ডিভাইসে এগুলো দেখা যাবে না এবং ইমেইল নোটিফিকেশন পাঠানো হয় না।";
