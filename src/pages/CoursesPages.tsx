import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Badge, ButtonLink, ComingSoon, EmptyState } from "../components/ui";
import { sampleCover } from "../data/sample";
import type { Course, Lesson } from "../data/courses";
import { hasEntitlement } from "../lib/coursesStore";
import { hasPurchase } from "../lib/payments";
import { useCourses } from "../lib/useCourses";
// ⚠ এন্টাইটেলমেন্ট: অ্যাডমিন পেমেন্ট অনুমোদনে (payments.ts approvePaymentRequest)
// এই কোর্সের অ্যাক্সেস তৈরি হয় — ফর্ম জমার সাথে সাথে নয়।
import {
  lessonOpenUrl,
  youTubeEmbedUrl,
  youTubeThumbnail,
  youTubeWatchUrl,
} from "../lib/youtube";

/* ───────────── হেল্পার ───────────── */

function bnNum(n: number) {
  return n.toLocaleString("bn-BD", { useGrouping: false });
}

function courseCover(course: Course): string {
  return course.cover?.trim() || sampleCover(`course-${course.slug}`);
}

function courseStats(course: Course) {
  const lessons = course.lessons.filter((l) => l.published);
  const withVideo = lessons.filter((l) => l.videoId).length;
  return { modules: course.modules.length, lessons: lessons.length, withVideo };
}

/** লোকাল প্রোফাইল (auth ব্যাকএন্ড Phase 2) — এন্টাইটেলমেন্ট এই অ্যাকাউন্টে বাঁধে */
function currentEmail(): string | null {
  try {
    const raw = localStorage.getItem("brm-profile-v1");
    if (!raw) return null;
    const p = JSON.parse(raw) as { email?: unknown };
    return typeof p.email === "string" && p.email ? p.email : null;
  } catch {
    return null;
  }
}

/**
 * কোর্সের মালিকানা — বিদ্যমান দুটি স্টোরের যেকোনো একটি হলেই অ্যাক্সেস:
 *  ১) coursesStore.hasEntitlement()  — কোর্স-এন্টাইটেলমেন্ট স্টোর
 *  ২) payments.hasPurchase("course") — অনুমোদিত পেমেন্ট থেকে তৈরি ক্রয় রেকর্ড
 * (অ্যাডমিন পেমেন্ট অনুমোদন করলে payments.ts-এ ক্রয় রেকর্ড তৈরি হয়; আগে কোর্স পেজ
 * শুধু এন্টাইটেলমেন্ট স্টোর দেখত, তাই অনুমোদিত কেনা কোর্স আনলক হতো না।)
 */
function ownsCourse(courseSlug: string, email: string | null): boolean {
  return hasEntitlement(courseSlug, email) || hasPurchase("course", courseSlug, email);
}

/* ───────────── কোর্স কার্ড (লিস্টিং) ───────────── */

function CourseCard({ course }: { course: Course }) {
  const stats = courseStats(course);
  const owned = ownsCourse(course.slug, currentEmail());
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <img
        src={courseCover(course)}
        alt=""
        loading="lazy"
        className="aspect-[16/9] w-full object-cover"
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {owned ? (
            <Badge tone="brand">✓ আমার কেনা কোর্স</Badge>
          ) : (
            <Badge>নমুনা দাম</Badge>
          )}
          <span className="font-bnserif text-lg font-bold text-brand">৳ {bnNum(course.price)}</span>
        </div>
        <h3 className="font-bnserif text-base font-bold leading-snug">{course.title}</h3>
        <p className="line-clamp-2 text-sm text-muted">{course.description}</p>
        <p className="text-xs text-faint">
          {bnNum(stats.modules)}টি মডিউল · {bnNum(stats.lessons)}টি লেসন
          {stats.withVideo > 0 && ` · ${bnNum(stats.withVideo)}টি ভিডিও লেসন`}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <ButtonLink to={`/courses/${course.slug}`} variant="secondary" size="sm">
            কোর্সের বিস্তারিত
          </ButtonLink>
          {!owned && (
            <ButtonLink to={`/courses/${course.slug}#purchase`} variant="primary" size="sm">
              কোর্সটি কিনুন
            </ButtonLink>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────── কোর্স লিস্টিং পেজ (/courses) ───────────── */

export function CoursesPage() {
  const courses = useCourses().filter((c) => c.published);
  return (
    <div>
      <div className="max-w-2xl">
        <h1 className="font-bnserif text-2xl font-bold">কোর্স</h1>
        <p className="mt-2 text-sm text-muted">
          পড়ার পেরেছে বাস্তব প্রশিক্ষণ — মডিউল ও ভিডিও লেসনে বাস্তব অনুশীলন।
          কিনলে (পেমেন্ট ভেরিফাই) সারাজীবন অ্যাক্সেস।
        </p>
        <p className="mt-1 text-xs text-faint">
          দামগুলো এখন নমুনা (ডেমো) মান — চূড়ান্ত ব্যবসায়িক মূল্য নয়; পেমেন্ট সিস্টেম এই ফেজে সক্রিয় নয়।
        </p>
      </div>
      {courses.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="এখনো কোনো কোর্স প্রকাশিত হয়নি" hint="অ্যাডমিন নতুন কোর্স যোগ করলে এখানে দেখা যাবে।" />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <CourseCard key={c.slug} course={c} />
          ))}
        </div>
      )}
      <div className="mt-6">
        <ComingSoon phase="পরবর্তী (bKash ম্যানুয়াল পেমেন্ট + অ্যাডমিন অ্যাপ্রুভাল)" />
      </div>
    </div>
  );
}

/* ───────────── লেসন টাইল কম্পোনেন্ট (গবেষণা/লক নিয়ম) ───────────── */

function LessonTile({
  lesson,
  unlocked,
}: {
  lesson: Lesson;
  /** কেনা কোর্সের মালিক/বা লিংক না থাকলে false+demo রাখা হয় */
  unlocked: boolean;
}) {
  const openUrl = lesson.videoId ? youTubeWatchUrl(lesson.videoId) : lessonOpenUrl(lesson);
  const thumb = lesson.videoId
    ? youTubeThumbnail(lesson.videoId, lesson.customThumbnail)
    : sampleCover(`lesson-${lesson.id}`);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <div className="relative">
        <img
          src={thumb}
          alt=""
          loading="lazy"
          className="aspect-video w-full object-cover"
        />
        {/* ভিডিও লিংক থাকলে + অ্যাক্সেস থাকলে: সরাসরি নিরাপদ নতুন ট্যাবে ওপেন */}
        {openUrl && unlocked ? (
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${lesson.title} — ইউটিউবে ভিডিও দেখুন`}
            className="absolute inset-0 grid place-items-center"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white/95 text-[var(--brand)] shadow-md ring-1 ring-black/5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.5v13l11-6.5-11-6.5Z" />
              </svg>
            </span>
          </a>
        ) : (
          <a
            aria-hidden
            tabIndex={-1}
            className="absolute inset-0 grid place-items-center cursor-not-allowed"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white/95 text-faint shadow-sm ring-1 ring-line">
              {openUrl ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5.5v13l11-6.5-11-6.5Z" />
                </svg>
              )}
            </span>
          </a>
        )}
        <span className="absolute left-2 top-2 rounded-md bg-[#1c1917]/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
          লেসন {bnNum(lesson.order)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h4 className="font-bnserif text-sm font-bold leading-snug">{lesson.title}</h4>
        {lesson.description && <p className="line-clamp-2 text-xs text-muted">{lesson.description}</p>}
        {openUrl && unlocked ? (
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-line hover:text-brand"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M21.6 7.2s-.2-1.4-.8-2c-.8-.8-1.7-.8-2.1-.9C15.9 4 12 4 12 4s-3.9 0-6.7.3c-.4.1-1.3.1-2.1.9-.6.6-.8 2-.8 2S2.2 8.8 2.2 10.4v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.8.8 1.8.8 2.2.9 1.7.2 6.6.2 6.6.2s3.9 0 6.7-.3c.4-.1 1.3-.1 2.1-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.5c0-1.6-.2-3.1-.2-3.1ZM9.8 14.3V8.9l5.6 2.7-5.6 2.7Z" />
            </svg>
            ইউটিউবে ভিডিও দেখুন
          </a>
        ) : (
          <p className="mt-auto text-xs text-faint">
            {openUrl ? "🔒 কোর্স কিনলে এই ভিডিও খুলবে" : "ⓘ এই লেসনে ইউটিউব লিংক এখনো যোগ হয়নি (অ্যাডমিন)"}
          </p>
        )}
      </div>
    </div>
  );
}

/* ───────────── কোর্স ডিটেইল পেজ (/courses/:slug) ───────────── */

export function CourseDetailPage() {
  const { slug } = useParams();
  const courses = useCourses();
  const course = courses.find((c) => c.slug === slug);

  if (!course) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-line bg-surface p-8 text-center">
        <h1 className="font-bnserif text-xl font-bold">কোর্স পাওয়া যায়নি</h1>
        <Link to="/courses" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
          ← সব কোর্স
        </Link>
      </div>
    );
  }
  if (!course.published) return <Navigate to="/courses" replace />;

  const email = currentEmail();
  const owned = ownsCourse(course.slug, email);
  const stats = courseStats(course);
  const publishedLessons = useMemo(
    () => course.lessons.filter((l) => l.published),
    [course.lessons],
  );

  return (
    <article className="mx-auto max-w-3xl">
      {/* ব্রেডক্রাম্ব */}
      <nav aria-label="ব্রেডক্রাম্ব" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link to="/" className="hover:text-brand">
              হোম
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link to="/courses" className="hover:text-brand">
              কোর্স
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="max-w-[14rem] truncate text-ink/80">{course.title}</li>
        </ol>
      </nav>

      <img
        src={courseCover(course)}
        alt=""
        className="mt-4 aspect-[16/9] w-full rounded-xl object-cover"
      />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Badge tone="brand">কোর্স</Badge>
        {owned && <Badge tone="brand">✓ আমার কেনা কোর্স</Badge>}
      </div>
      <h1 className="font-bnserif mt-3 text-2xl font-bold leading-snug sm:text-3xl">{course.title}</h1>
      <p className="mt-2 text-sm text-faint">
        {bnNum(stats.modules)}টি মডিউল · {bnNum(stats.lessons)}টি লেসন
        {stats.withVideo > 0 && ` · ${bnNum(stats.withVideo)}টি ভিডিও লেসন`} · লাইফটাইম অ্যাক্সেস
      </p>

      <div className="article-body mt-4">
        <p>{course.description}</p>
      </div>

      {/* শেখার উদ্দেশ্য + কার জন্য */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-bnserif text-base font-bold">যা শিখবে</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            {course.objectives.map((o, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 text-brand">✓</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <h2 className="font-bnserif text-base font-bold">কে করবে এই কোর্স</h2>
          <p className="mt-2 text-sm text-muted">{course.audience}</p>
        </div>
      </section>

      {/* আমার কেনা কোর্স — শুধু যাচাই-করা এন্টাইটেলমেন্টে */}
      {owned && (
        <section className="mt-6 rounded-xl border border-brand-line bg-brand-soft p-5">
          <p className="font-bnserif text-base font-bold text-brand">
            ✓ আপনি এই কোর্সের মালিক — লাইফটাইম অ্যাক্সেস
          </p>
          <p className="mt-1 text-sm text-muted">
            সব ভিডিও লেসন এখন খোলা; ভবিষ্যতে নতুন লেসন যোগ হলেও সেগুলো অ্যাক্সেস থাকবে।
            {email ? ` অ্যাকাউন্ট: ${email}` : " লোকাল অ্যাকাউন্ট অবস্থায় এন্টাইটেলমেন্ট এই ডিভাইসে বাঁধা।"}
          </p>
        </section>
      )}

      {/* কারিকুলাম */}
      <section className="mt-8">
        <h2 className="font-bnserif text-lg font-bold">কারিকুলাম</h2>
        {course.modules
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((m) => {
            const lessons = publishedLessons
              .filter((l) => l.moduleId === m.id)
              .sort((a, b) => a.order - b.order);
            return (
              <div key={m.id} className="mt-4 rounded-xl border border-line bg-surface p-4">
                <h3 className="font-bnserif text-sm font-bold text-brand">
                  মডিউল {bnNum(m.order)}: {m.title}
                </h3>
                {lessons.length === 0 ? (
                  <p className="mt-2 text-xs text-faint">এই মডিউলে এখনো লেসন যোগ হয়নি (অ্যাডমিন)।</p>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {lessons.map((l) => (
                      <LessonTile key={l.id} lesson={l} unlocked={owned} />
                    ))}
                  </div>
                )}
                {/* অ্যাক্সেস-থাকলে এম্বেড প্লেয়ারও চালু (লিংক-ভিত্তিক) */}
                {owned &&
                  lessons
                    .filter((l) => l.videoId)
                    .slice(0, 1)
                    .map((l) => (
                      <div key={l.id} className="mt-3 rounded-lg border border-line bg-black/5 p-2">
                        <p className="mb-2 text-xs text-muted">
                          ⚠️ এম্বেড ব্লক থাকলে উপরের থাম্বনেইল বা “ইউটিউবে ভিডিও দেখুন” বাটনে ক্লিক করো —
                          সরাসরি ইউটিউব খুলবে।
                        </p>
                        <div className="aspect-video overflow-hidden rounded-lg bg-black">
                          <iframe
                            src={youTubeEmbedUrl(l.videoId!)}
                            title={l.title}
                            className="h-full w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    ))}
              </div>
            );
          })}
      </section>

      {/* কেনা (ম্যানুয়াল পেমেন্ট — রেডি): অ্যাক্সেস শুধু অ্যাডমিন যাচাই-পটি অনুমোদনে */}
      {!owned && (
        <section id="purchase" className="mt-8 scroll-mt-24 rounded-xl border border-line bg-surface p-6">
          <h2 className="font-bnserif text-lg font-bold">কোর্সটি কিনুন</h2>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div className="font-bnserif text-2xl font-bold text-brand">৳ {bnNum(course.price)}</div>
            <ButtonLink to={`/checkout/course/${course.slug}`} size="lg">
              কোর্সটি কিনুন
            </ButtonLink>
          </div>
          <p className="mt-3 text-sm text-muted">
            ভবিষ্যতে bKash ম্যানুয়াল পেমেন্ট জমা দেওয়ার ফ্লো আসবে: পেমেন্ট → TrxID জমা → অ্যাডমিন
            অ্যাপ্রুভাল → সারাজীবন অ্যাক্সেস। এই ফেজে ফর্ম জমা দিলে কোনো অ্যাক্সেস নেওয়া যাবে না এবং
            কোনো ভুয়া “সফল” মেসেজও দেখানো হয় না।
          </p>
        </section>
      )}

      <button
        onClick={() => window.history.back()}
        className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2 transition-colors w-full mb-4"
        aria-label="পেছনে ফেরে"
      >
        ← পেছনে ফেরে
      </button>
      <p className="mt-8 text-sm">
        <Link to="/courses" className="text-brand hover:underline">
          ← সব কোর্স
        </Link>
      </p>
    </article>
  );
}
