import { useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  ComingSoon,
  EmptyState,
  Input,
  SectionHeading,
} from "../components/ui";
import { categories } from "../data/sample";
import { videos } from "../data/videos";
import type { Video } from "../data/types";

/* ─────────────────────────── হেল্পার ─────────────────────────── */

function bnNum(n: number) {
  return n.toLocaleString("bn-BD", { useGrouping: false });
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** বিদ্যমান ক্যাটেগরি সিস্টেম থেকে নাম — নতুন ক্যাটেগরি নয় */
function categoryName(slug: string) {
  return categories.find((c) => c.slug === slug)?.name ?? slug;
}

function DurationChip({ min }: { min: number }) {
  return (
    <span className="absolute bottom-2 right-2 rounded-md bg-[#1c1917]/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
      {bnNum(min)} মিনিট
    </span>
  );
}

function PlayOverlay() {
  return (
    <span aria-hidden className="absolute inset-0 grid place-items-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-white/95 text-[var(--brand)] shadow-md ring-1 ring-black/5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.5v13l11-6.5-11-6.5Z" />
        </svg>
      </span>
    </span>
  );
}

function StatusBadges({ video }: { video: Video }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="brand">{categoryName(video.categorySlug)}</Badge>
      {video.access === "premium-future" ? (
        <Badge tone="warn">শীঘ্রণ প্রিমিয়াম · ৳ {video.price}</Badge>
      ) : (
        <Badge>ফ্রি</Badge>
      )}
    </div>
  );
}

/* ─────────────────────────── ভিডিও কার্ড ─────────────────────────── */

export function VideoCard({ video }: { video: Video }) {
  return (
    <Link
      to={`/videos/${video.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-brand-line"
    >
      <div className="relative aspect-video overflow-hidden">
        <img
          src={video.thumbnail}
          alt="{video.title} ছাড়"
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
        />
        <PlayOverlay />
        <DurationChip min={video.durationMin} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <StatusBadges video={video} />
        <h3 className="font-bnserif text-base font-bold leading-snug group-hover:text-brand">
          {video.title}
        </h3>
        <p className="line-clamp-2 text-sm text-muted">{video.description}</p>
      </div>
    </Link>
  );
}

/* ─────────────────────────── প্লেয়ার অঞ্চল ─────────────────────────── */

/**
 * সোর্স কনফিগার হলে YouTube এম্বেড বা ফাইল প্লেয়ার দেখাবে;
 * সোর্স না থাকলে (এই ডেমো ফেজে) স্পষ্ট প্লেসহোল্ডার — ভুয়া প্লেয়ার নয়।
 */
function PlayerArea({ video }: { video: Video }) {
  if (video.sourceUrl && video.sourceType === "youtube") {
    return (
      <div className="aspect-video overflow-hidden rounded-xl border border-line bg-surface">
        <iframe
          src={video.sourceUrl}
          title={video.title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (video.sourceUrl && video.sourceType === "file") {
    return (
      <div className="aspect-video overflow-hidden rounded-xl border border-line bg-surface">
        <video src={video.sourceUrl} controls className="h-full w-full bg-black" />
      </div>
    );
  }
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl border border-dashed border-line bg-surface-2">
      <div className="absolute inset-0 grid place-items-center text-center">
        <div className="grid justify-items-center gap-1.5 px-4">
          <span
            aria-hidden
            className="grid h-14 w-14 place-items-center rounded-full bg-surface text-faint ring-1 border-line shadow-sm"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5.5v13l11-6.5-11-6.5Z" />
            </svg>
          </span>
          <p className="text-sm font-semibold text-ink/80">ডেমো প্লেয়ার অঞ্চল (১৬:৯)</p>
          <p className="text-xs text-muted">
            আসল ভিডিও সোর্স (YouTube বা ফাইল) পরবর্তী ফেজে কনফিগার হবে — এখনো যোগ হয়নি।
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── ভিডিও লাইব্রেরি পেজ ─────────────────────────── */

export function VideosPage() {
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return videos.filter((v) => {
      const okCat = !cat || v.categorySlug === cat;
      const okQ =
        !query ||
        v.title.toLowerCase().includes(query) ||
        v.description.toLowerCase().includes(query);
      return okCat && okQ;
    });
  }, [cat, q]);

  const featured = videos.find((v) => v.featured) ?? videos[0];

  return (
    <div>
      {/* হেডিং + সংক্ষিপ্ত ভূমিকা */}
      <div className="max-w-2xl">
        <h1 className="font-bnserif text-2xl font-bold">ভিডিও লাইব্রেরি</h1>
        <p className="mt-2 text-sm text-muted">
          পড়ার পাশাপাশি ছোট ভিডিও গাইড — মাত্র ৫–১০ মিনিটে বাস্তব দিকনির্দেশনা।
          ভিডিওগুলো সাইটের বিদ্যমান ক্যাটেগরি অনুযায়ী সাজানো।
        </p>
        <p className="mt-1 text-xs text-faint">
          ডেমো প্রস্তুতি: এই ফেজে সব ভিডিও নমুনা — আসল ভিডিও সোর্স যোগ হওয়ার পরই প্লে হবে।
        </p>
      </div>

      {/* ফিচার্ড ভিডিও */}
      {featured && (
        <Link
          to={`/videos/${featured.slug}`}
          className="group mt-6 block rounded-xl border border-line bg-surface transition-colors hover:border-brand-line"
          aria-label={`ফিচার্ড ভিডিও: ${featured.title}`}
        >
          <div className="grid gap-4 p-4 sm:grid-cols-5">
            <div className="relative overflow-hidden rounded-lg sm:col-span-3">
              <div className="relative aspect-video overflow-hidden rounded-lg">
                <img
                  src={featured.thumbnail}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                />
                <PlayOverlay />
                <DurationChip min={featured.durationMin} />
              </div>
            </div>
            <div className="flex flex-col justify-center gap-2 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                ফিচার্ড ভিডিও
              </p>
              <h2 className="font-bnserif text-lg font-bold leading-snug group-hover:text-brand">
                {featured.title}
              </h2>
              <p className="line-clamp-3 text-sm text-muted">{featured.description}</p>
              <StatusBadges video={featured} />
            </div>
          </div>
        </Link>
      )}

      {/* ফিল্টার + সার্চ */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCat(null)}
          className={`rounded-full border px-3 py-1 text-sm ${
            cat === null
              ? "border-brand-line bg-brand-soft text-brand"
              : "border-line bg-surface text-muted hover:text-ink"
          }`}
        >
          সব
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            onClick={() => setCat(c.slug)}
            className={`rounded-full border px-3 py-1 text-sm ${
              cat === c.slug
                ? "border-brand-line bg-brand-soft text-brand"
                : "border-line bg-surface text-muted hover:text-ink"
            }`}
          >
            {c.name}
          </button>
        ))}
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ভিডিও খুঁজুন…"
          aria-label="ভিডিও অনুসন্ধান"
          className="ml-auto max-w-56"
        />
      </div>

      {/* গ্রিড / খালি অবস্থা */}
      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="কোনো ভিডিও পাওয়া যায়নি"
            hint="অন্য ক্যাটেগরি বা শব্দ দিয়ে খুঁজে দেখো।"
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <VideoCard key={v.slug} video={v} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── ভিডিও ডিটেইল পেজ ─────────────────────────── */

export function VideoDetailPage() {
  const { slug } = useParams();
  const video = videos.find((v) => v.slug === slug);
  if (!video) return <Navigate to="/videos" replace />;

  const related = videos.filter(
    (v) => v.slug !== video.slug && v.categorySlug === video.categorySlug,
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
            <Link to="/videos" className="hover:text-brand">
              ভিডিও লাইব্রেরি
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="max-w-[16rem] truncate text-ink/80">{video.title}</li>
        </ol>
      </nav>

      {/* প্লেয়ার (১৬:৯) */}
      <div className="mt-4">
        <PlayerArea video={video} />
      </div>

      {/* টাইটেল + মেটা */}
      <div className="mt-5">
        <StatusBadges video={video} />
        <h1 className="font-bnserif mt-3 text-2xl font-bold leading-snug sm:text-3xl">
          {video.title}
        </h1>
        <p className="mt-2 text-sm text-faint">
          {fmtDate(video.publishedAt)} · {bnNum(video.durationMin)} মিনিট ·{" "}
          {categoryName(video.categorySlug)}
        </p>
      </div>

      {/* বর্ণনা */}
      <div className="article-body mt-6">
        <p>{video.description}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {video.tags.map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
      </div>

      {/* ফিউচার-প্রিমিয়াম ভিজ্যুয়াল প্রস্তুতি — এই ফেজে ভিডিও ফ্রি, চার্জ নয় */}
      {video.access === "premium-future" && (
        <section className="mt-6 rounded-xl border border-line bg-amber-50 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="warn">শীঘ্রণ প্রিমিয়াম</Badge>
            <span className="font-bnserif text-xl font-bold text-brand">৳ {video.price}</span>
          </div>
          <p className="mt-2 text-sm text-muted">
            এই ভিডিও ভবিষ্যতে প্রিমিয়াম হবে। কিন্তু এই ফেজে সব ডেমো ভিডিও ফ্রি —
            কোনো রিস্ট্রিকশন বা চার্জ নেই।
          </p>
          <Button disabled className="mt-3" title="পেমেন্ট সিস্টেম সক্রিয় হলে (Phase 4) সক্রিয় হবে">
            কিনতে চাই (শীঘ্রণ)
          </Button>
        </section>
      )}

      {/* সম্পর্কিত ভিডিও */}
      {related.length > 0 && (
        <div className="mt-10">
          <SectionHeading title="সম্পর্কিত ভিডিও" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((v) => (
              <VideoCard key={v.slug} video={v} />
            ))}
          </div>
        </div>
      )}

      {/* লাইব্রেরিতে ফেরা */}
      <p className="mt-8 text-sm">
        <Link to="/videos" className="text-brand hover:underline">
          ← ভিডিও লাইব্রেরিতে ফেরা
        </Link>
      </p>
    </article>
  );
}

/* ─────────────────────────── ভিডিও যোগ-ফর্ম (ফিউচার-রেডি) ─────────────────────────── */

type FormState = {
  title: string;
  description: string;
  categorySlug: string;
  thumbnail: string;
  sourceType: "youtube" | "file";
  sourceUrl: string;
  durationMin: string;
  access: "free" | "premium-future";
  price: string;
};

const emptyForm: FormState = {
  title: "",
  description: "",
  categorySlug: categories[0]?.slug ?? "",
  thumbnail: "",
  sourceType: "youtube",
  sourceUrl: "",
  durationMin: "",
  access: "free",
  price: "",
};

const inputCls =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint";

export function AdminVideoFormPage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitted, setSubmitted] = useState(false);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const showThumbPreview = /^(https?:\/\/|\/|data:image)/.test(form.thumbnail.trim());

  return (
    <div className="mx-auto max-w-2xl">
      <div className="max-w-2xl">
        <h1 className="font-bnserif text-2xl font-bold">ভিডিও যোগ করুন (প্রশাসন)</h1>
        <p className="mt-2 text-sm text-muted">
          ফিউচার-রেডি এন্ট্রি ফর্ম — ব্যাকএন্ড সংযুক্ত হলে (পরবর্তী ফেজে) এখান থেকেই
          নতুন ভিডিও প্রকাশ করা যাবে। এখনো কিছু সেভ হয় না।
        </p>
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="v-title" className="mb-1.5 block text-sm font-medium">
              শিরোনাম *
            </label>
            <Input
              id="v-title"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="যেমন: নিজের আত্মবিশ্বাস বাড়ানোর ৫টি উপায়"
            />
          </div>

          <div>
            <label htmlFor="v-desc" className="mb-1.5 block text-sm font-medium">
              বর্ণনা
            </label>
            <textarea
              id="v-desc"
              rows={3}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              className={inputCls}
              placeholder="ভিডিওটি কী শেখায় — সংক্ষেপে"
            />
          </div>

          <div>
            <label htmlFor="v-cat" className="mb-1.5 block text-sm font-medium">
              ক্যাটেগরি (বিদ্যমান তালিকা) *
            </label>
            <select
              id="v-cat"
              value={form.categorySlug}
              onChange={(e) => set({ categorySlug: e.target.value })}
              className={inputCls}
            >
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-faint">
              সাইটের বিদ্যমান ক্যাটেগরি ব্যবহার হচ্ছে — নতুন/ডুপ্লিকেট ক্যাটেগরি তৈরি হয় না।
            </p>
          </div>

          <div>
            <label htmlFor="v-thumb" className="mb-1.5 block text-sm font-medium">
              থাম্বনেইল (URL বা ফাইল পথ)
            </label>
            <Input
              id="v-thumb"
              value={form.thumbnail}
              onChange={(e) => set({ thumbnail: e.target.value })}
              placeholder="https://… অথবা /thumbs/…"
            />
            {showThumbPreview && (
              <img
                src={form.thumbnail}
                alt="থাম্বনেইল প্রিভিউ"
                className="mt-2 aspect-video w-full max-w-sm rounded-lg border border-line object-cover"
              />
            )}
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium">ভিডিও সোর্সের ধরন</span>
            <div className="flex flex-wrap gap-2">
              {(["youtube", "file"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set({ sourceType: t })}
                  aria-pressed={form.sourceType === t}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    form.sourceType === t
                      ? "border-brand-line bg-brand-soft text-brand"
                      : "border-line bg-surface text-muted hover:text-ink"
                  }`}
                >
                  {t === "youtube" ? "YouTube এম্বেড" : "সরাসরি ফাইল"}
                </button>
              ))}
            </div>
            <label htmlFor="v-url" className="mb-1.5 mt-3 block text-sm font-medium">
              ভিডিও URL / ফাইল নির্বাচন
            </label>
            <Input
              id="v-url"
              value={form.sourceUrl}
              onChange={(e) => set({ sourceUrl: e.target.value })}
              placeholder={
                form.sourceType === "youtube"
                  ? "https://www.youtube.com/watch?v=…"
                  : "https://…/video.mp4 অথবা আপলোড (পরে)"
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="v-dur" className="mb-1.5 block text-sm font-medium">
                সময়কাল (মিনিট)
              </label>
              <Input
                id="v-dur"
                type="number"
                min={1}
                value={form.durationMin}
                onChange={(e) => set({ durationMin: e.target.value })}
                placeholder="যেমন: 8"
              />
            </div>
            <div>
              <label htmlFor="v-access" className="mb-1.5 block text-sm font-medium">
                অ্যাক্সেস
              </label>
              <select
                id="v-access"
                value={form.access}
                onChange={(e) => set({ access: e.target.value as FormState["access"] })}
                className={inputCls}
              >
                <option value="free">ফ্রি</option>
                <option value="premium-future">প্রিমিয়াম (শীঘ্রণ)</option>
              </select>
            </div>
          </div>

          {form.access === "premium-future" && (
            <div>
              <label htmlFor="v-price" className="mb-1.5 block text-sm font-medium">
                দাম (৳) — ভবিষ্যতের প্রিমিয়াম ভিডিওর জন্য
              </label>
              <Input
                id="v-price"
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => set({ price: e.target.value })}
                placeholder="যেমন: 49"
              />
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit">ভিডিও এন্ট্রি জমা দিন</Button>
            <Button type="button" variant="ghost" onClick={() => setForm(emptyForm)}>
              মুছে ফেলুন
            </Button>
          </div>

          {submitted && (
            <div className="rounded-lg border border-line bg-amber-50 px-4 py-3 text-sm text-amber-900">
              ⓘ ডেমো ফর্ম — ব্যাকএন্ড সংযুক্ত হলে (পরবর্তী ফেজে) এই এন্ট্রিটি সেভ ও প্রকাশ হবে।
              এখন কিছুই সেভ হয়নি।
            </div>
          )}
        </form>
      </Card>

      <div className="mt-4">
        <ComingSoon phase="2 (ভিডিও স্টোরেজ + ব্যাকএন্ড)" />
      </div>
    </div>
  );
}
