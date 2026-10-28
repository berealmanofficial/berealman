import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, ButtonLink, Card, Input } from "../components/ui";
import { categories } from "../data/sample";
import { useSession } from "../lib/auth";
import { AdminGate } from "../lib/AdminGate";
import { useAdminAccess } from "../lib/adminGate";
import {
  APPLICATION_STATUS_LABEL,
  ARTICLE_STATUS_LABEL,
  MAX_ARTICLE_IMAGES,
  MAX_SAMPLE_IMAGES,
  SAMPLE_MIN_WORDS,
  WRITERS_LIMITATION_BN,
  articleById,
  articleEditableByStatus,
  applicationForEmail,
  fileToDataUrl,
  newArticle,
  reviewArticle,
  saveApplication,
  saveArticle,
  sampleForApplication,
  setApplicationStatus,
  upsertSample,
  useWriters,
  wordCount,
  type ApplicationInput,
  type WriterApplication,
  type WriterArticle,
} from "../lib/writers";

/**
 * লেখক সিস্টেম পেজসমূহ
 * ------------------------------------------------------------------
 * ফ্লো: আবেদন → লেখার নমুনা → অ্যাডমিন রিভিউ → অনুমোদন → আর্টিকেল লেখা →
 * রিভিউ → প্রকাশ। সাইটের বিদ্যমান ডিজাইন ল্যাঙ্গুয়েজ (Card/Button/Input/Badge,
 * বাংলা টাইপোগ্রাফি, উত্তরদিক) অনুসরণ করে — সাধারণ পেজে কোনো পরিবর্তন নেই।
 * ------------------------------------------------------------------
 */

/* ───────────────── শেয়ার্ড হেল্পার ───────────────── */

function statusTone(status: string) {
  if (status === "approved" || status === "published") return "border-brand-line bg-brand-soft text-brand";
  if (status === "rejected") return "border-danger/30 bg-danger-soft text-danger";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function StatusBadge({ label, status }: { label: string; status: string }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusTone(status)}`}>
      {label}
    </span>
  );
}

function LimitationNote() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
      ⓘ {WRITERS_LIMITATION_BN}
    </div>
  );
}

function FieldLabel({ htmlFor, children, hint }: { htmlFor?: string; children: string; hint?: string }) {
  return (
    <div className="mb-1 flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {children}
      </label>
      {hint && <span className="text-xs text-faint">{hint}</span>}
    </div>
  );
}

function FieldError({ children }: { children: string }) {
  return (
    <p className="mt-1 text-xs text-danger" role="alert">
      {children}
    </p>
  );
}

const URL_RE = /^https?:\/\/\S+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const BD_MOBILE_RE = /^01[3-9]\d{8}$/;

/* ───────────────── ১. আবেদন ফর্ম (/writers/apply) ───────────────── */

const emptyApplication: ApplicationInput = {
  fullName: "",
  displayName: "",
  contactEmail: "",
  mobile: "",
  avatar: "",
  bio: "",
  over18: false,
  education: "",
  institution: "",
  profession: "",
  workplace: "",
  experience: "",
  publishedLink: "",
  expertise: "",
  categorySlug: "",
  facebookUrl: "",
  extraInfo: "",
};

function validateApplication(v: ApplicationInput): Record<string, string> {
  const e: Record<string, string> = {};
  if (v.fullName.trim().length < 3) e.fullName = "আসল/আইনি নাম কমপক্ষে ৩ অক্ষরের লিখো।";
  if (v.displayName.trim().length < 2) e.displayName = "লেখক পরিচিতি নাম কমপক্ষে ২ অক্ষরের দাও।";
  if (!EMAIL_RE.test(v.contactEmail.trim())) e.contactEmail = "সঠিক ইমেইল ঠিকানা লিখো (যেমন: name@example.com)।";
  if (!BD_MOBILE_RE.test(v.mobile.trim())) e.mobile = "১১ সংখ্যার সঠিক মোবাইল নম্বর দাও (যেমন: 01712345678)।";
  if (v.bio.trim().length < 30) e.bio = "সংক্ষিপ্ত বায়ো কমপক্ষে ৩০ অক্ষরের — নিজেকে পরিচয় করাও।";
  if (!v.over18) e.over18 = "১৮ বছরের বেশি বয়স নিশ্চিত করো — এটি ছাড়া আবেদন জমা হবে না।";
  if (!v.education.trim()) e.education = "শিক্ষাগত যোগ্যতা লেখো।";
  if (!v.profession.trim()) e.profession = "পেশা লেখো।";
  if (v.experience.trim().length < 20) e.experience = "লেখালেখির অভিজ্ঞতা অন্তত ২০ অক্ষরে বর্ণনা করো।";
  if (v.publishedLink.trim() && !URL_RE.test(v.publishedLink.trim()))
    e.publishedLink = "লিংক সঠিক হতে হবে — http:// বা https:// দিয়ে শুরু করো।";
  if (!v.expertise.trim()) e.expertise = "কীসের উপর লিখতে পারবে তা লেখো।";
  if (!v.categorySlug) e.categorySlug = "পছন্দের লেখার ক্যাটেগরি বাছো।";
  if (!URL_RE.test(v.facebookUrl.trim()))
    e.facebookUrl = "তোমার ফেসবুক প্রোফাইলের সঠিক লিংক দাও (https://facebook.com/…)।";
  return e;
}

function AvatarPicker({ value, onValue, error }: { value: string; onValue: (v: string) => void; error?: string }) {
  const [imgError, setImgError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = async (ev: ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    ev.target.value = "";
    if (!f) return;
    try {
      onValue(await fileToDataUrl(f));
      setImgError(null);
    } catch (err) {
      setImgError(err instanceof Error ? err.message : "ছবি পড়া যায়নি।");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="প্রোফাইল ছবি" className="h-14 w-14 rounded-full border border-line object-cover" />
        ) : (
          <span className="grid h-14 w-14 place-items-center rounded-full border border-dashed border-line bg-surface-2 text-lg text-faint">
            ?
          </span>
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" type="button" onClick={() => fileRef.current?.click()}>
            ছবি যোগ / বদল
          </Button>
          {value && (
            <Button size="sm" variant="ghost" type="button" onClick={() => onValue("")}>
              ছবি সরাও
            </Button>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs text-faint">JPEG/PNG/WebP · বড় ছবি স্বয়ংক্রিয়ভাবে কমে সেভ হয়</p>
      {(imgError || error) && <FieldError>{imgError ?? error ?? ""}</FieldError>}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} />
    </div>
  );
}

export function ApplyPage() {
  const session = useSession();
  const writable = useWriters();

  const app = useMemo(
    () => (session ? applicationForEmail(session.email) : undefined),
    // writable এ পরিবর্তন হলে আবেদন রিফ্রেশ
    [session, writable],
  );

  if (!session) {
    return <Navigate to={`/login?next=${encodeURIComponent("/writers/apply")}`} replace />;
  }

  if (app && app.status === "approved") {
    return (
      <Card className="mx-auto max-w-xl p-6 text-center">
        <Badge tone="brand">✅ তুমি অনুমোদিত লেখক</Badge>
        <h1 className="mt-3 font-bnserif text-xl font-bold">তোমার লেখকের ড্যাশবোর্ড প্রোফাইলে</h1>
        <p className="mt-1 text-sm text-muted">
          লেখালেখির সব ফিচার এখন প্রোফাইলের "লেখক ড্যাশবোর্ড" সেকশনে আছে।
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <ButtonLink to="/profile?section=writer">লেখক ড্যাশবোর্ডে যাও</ButtonLink>
          <ButtonLink to="/writers/articles" variant="secondary">
            আমার আর্টিকেল
          </ButtonLink>
        </div>
      </Card>
    );
  }

  if (app && (app.status === "submitted" || app.status === "under-review")) {
    // ফর্ম সাবমিট → নমুনা ধাপে চালিয়ে যাওয়া (অসম্পূর্ণ আবেদন এখান থেকেই resume)
    return <Navigate to="/writers/sample" replace />;
  }

  // কোনো আবেদন নেই, অথবা প্রত্যাখ্যাত (পরিষ্কার করে আবার জমা চলে)
  const initial: ApplicationInput =
    app
      ? {
          fullName: app.fullName,
          displayName: app.displayName,
          contactEmail: app.contactEmail,
          mobile: app.mobile,
          avatar: app.avatar,
          bio: app.bio,
          over18: app.over18,
          education: app.education,
          institution: app.institution,
          profession: app.profession,
          workplace: app.workplace,
          experience: app.experience,
          publishedLink: app.publishedLink,
          expertise: app.expertise,
          categorySlug: app.categorySlug,
          facebookUrl: app.facebookUrl,
          extraInfo: app.extraInfo,
        }
      : { ...emptyApplication, contactEmail: session.email, fullName: session.name || "" };

  return <ApplicationForm initial={initial} rejectedNote={app?.status === "rejected" ? app.reviewNote ?? null : null} />;
}

function ApplicationForm({
  initial,
  rejectedNote,
}: {
  initial: ApplicationInput;
  rejectedNote: string | null;
}) {
  const session = useSession();
  const navigate = useNavigate();
  const [v, setV] = useState<ApplicationInput>(initial);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const set = (patch: Partial<ApplicationInput>) => setV((prev) => ({ ...prev, ...patch }));

  /** সেভ করে সত্য — ভুল থাকলে বাংলা বার্তা; ঠিক পথে লেখার নমুনায় */
  const persist = (): boolean => {
    const problem = validateApplication(v);
    setErrs(problem);
    setSaved(false);
    if (Object.keys(problem).length > 0) return false;
    if (!session) return false;
    saveApplication(session.email, {
      fullName: v.fullName.trim(),
      displayName: v.displayName.trim(),
      contactEmail: v.contactEmail.trim().toLowerCase(),
      mobile: v.mobile.trim(),
      avatar: v.avatar,
      bio: v.bio.trim(),
      over18: v.over18,
      education: v.education.trim(),
      institution: v.institution.trim(),
      profession: v.profession.trim(),
      workplace: v.workplace.trim(),
      experience: v.experience.trim(),
      publishedLink: v.publishedLink.trim(),
      expertise: v.expertise.trim(),
      categorySlug: v.categorySlug,
      facebookUrl: v.facebookUrl.trim(),
      extraInfo: v.extraInfo.trim(),
    });
    return true;
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="p-5 sm:p-6">
        <Badge tone="brand">লেখক আবেদন</Badge>
        <h1 className="mt-2 font-bnserif text-2xl font-bold">লেখক হোন — আবেদন ফর্ম</h1>
        <p className="mt-1 text-sm text-muted">
          আবেদন পূরণ করলে পরবর্তীতে একটি লেখার নমুনা (কমপক্ষে ৫০০ শব্দ) জমা দিতে হবে। অসম্পূর্ণ আবেদন
          সেভ রেখে পরে লগইন করে চালিয়ে যাওয়া যাবে।
        </p>
        {rejectedNote && (
          <div className="mt-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            পূর্ববর্তী আবেদনটি প্রত্যাখ্যাত হয়েছিল — কারণ: {rejectedNote}। তথ্য ঠিক করে আবার জমা দাও।
          </div>
        )}

        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (persist()) navigate("/writers/sample");
          }}
        >
          <div>
            <FieldLabel htmlFor="wa-fullname">আসল / আইনি নাম *</FieldLabel>
            <Input id="wa-fullname" value={v.fullName} onChange={(e) => set({ fullName: e.target.value })} />
            {errs.fullName && <FieldError>{errs.fullName}</FieldError>}
          </div>
          <div>
            <FieldLabel htmlFor="wa-display" hint="প্রকাশিত লেখায় ব্যবহৃত হবে">
              পছন্দের লেখক নাম *
            </FieldLabel>
            <Input id="wa-display" value={v.displayName} onChange={(e) => set({ displayName: e.target.value })} />
            {errs.displayName && <FieldError>{errs.displayName}</FieldError>}
          </div>
          <div>
            <FieldLabel htmlFor="wa-email">ইমেইল *</FieldLabel>
            <Input id="wa-email" type="email" value={v.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} />
            {errs.contactEmail && <FieldError>{errs.contactEmail}</FieldError>}
          </div>
          <div>
            <FieldLabel htmlFor="wa-mobile">মোবাইল নম্বর *</FieldLabel>
            <Input id="wa-mobile" inputMode="tel" placeholder="01XXXXXXXXX" value={v.mobile} onChange={(e) => set({ mobile: e.target.value })} />
            {errs.mobile && <FieldError>{errs.mobile}</FieldError>}
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>প্রোফাইল ছবি</FieldLabel>
            <AvatarPicker value={v.avatar} onValue={(avatar) => set({ avatar })} error={errs.avatar} />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="wa-bio">সংক্ষিপ্ত বায়ো *</FieldLabel>
            <textarea
              id="wa-bio"
              rows={3}
              value={v.bio}
              onChange={(e) => set({ bio: e.target.value })}
              placeholder="নিজেকে কয়েক লাইনে পরিচয় করাও…"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint"
            />
            {errs.bio && <FieldError>{errs.bio}</FieldError>}
          </div>
          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={v.over18}
                onChange={(e) => set({ over18: e.target.checked })}
                className="mt-0.5 h-4 w-4"
              />
              <span>আমি নিশ্চিত করছি — আমার বয়স ১৮ বছরের বেশি। *</span>
            </label>
            {errs.over18 && <FieldError>{errs.over18}</FieldError>}
          </div>
          <div>
            <FieldLabel htmlFor="wa-edu">শিক্ষাগত যোগ্যতা *</FieldLabel>
            <Input id="wa-edu" value={v.education} onChange={(e) => set({ education: e.target.value })} placeholder="কোনো নির্দিষ্ট ডিগ্রি বাধ্যতামূলক নয়" />
            {errs.education && <FieldError>{errs.education}</FieldError>}
          </div>
          <div>
            <FieldLabel htmlFor="wa-inst" hint="প্রযোজ্য হলে">
              প্রতিষ্ঠান
            </FieldLabel>
            <Input id="wa-inst" value={v.institution} onChange={(e) => set({ institution: e.target.value })} />
          </div>
          <div>
            <FieldLabel htmlFor="wa-prof">পেশা *</FieldLabel>
            <Input id="wa-prof" value={v.profession} onChange={(e) => set({ profession: e.target.value })} />
            {errs.profession && <FieldError>{errs.profession}</FieldError>}
          </div>
          <div>
            <FieldLabel htmlFor="wa-work" hint="ঐচ্ছিক">
              বর্তমান কর্মস্থল
            </FieldLabel>
            <Input id="wa-work" value={v.workplace} onChange={(e) => set({ workplace: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="wa-exp">লেখালেখির অভিজ্ঞতা *</FieldLabel>
            <textarea
              id="wa-exp"
              rows={3}
              value={v.experience}
              onChange={(e) => set({ experience: e.target.value })}
              placeholder="কোথায়, কত দিন ধরে লিখছো…"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint"
            />
            {errs.experience && <FieldError>{errs.experience}</FieldError>}
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="wa-link" hint="ঐচ্ছিক">
              পূর্বে প্রকাশিত লেখার লিংক
            </FieldLabel>
            <Input id="wa-link" inputMode="url" value={v.publishedLink} onChange={(e) => set({ publishedLink: e.target.value })} placeholder="https://…" />
            {errs.publishedLink && <FieldError>{errs.publishedLink}</FieldError>}
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="wa-expertise">বিশেষজ্ঞ এলাকা / কীসে লিখতে পারেন *</FieldLabel>
            <Input id="wa-expertise" value={v.expertise} onChange={(e) => set({ expertise: e.target.value })} placeholder="যেমন: ইমান-আকিদা, শরীরচর্চা, কর্মজীবন…" />
            {errs.expertise && <FieldError>{errs.expertise}</FieldError>}
          </div>
          <div>
            <FieldLabel htmlFor="wa-cat">পছন্দের লেখার ক্যাটেগরি *</FieldLabel>
            <select
              id="wa-cat"
              value={v.categorySlug}
              onChange={(e) => set({ categorySlug: e.target.value })}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
            >
              <option value="">— বাছো —</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-faint">সাইটের বিদ্যমান ক্যাটেগরি সিস্টেম থেকেই বাছাই করা যায়।</p>
            {errs.categorySlug && <FieldError>{errs.categorySlug}</FieldError>}
          </div>
          <div>
            <FieldLabel htmlFor="wa-fb">ফেসবুক প্রোফাইল লিংক *</FieldLabel>
            <Input id="wa-fb" inputMode="url" value={v.facebookUrl} onChange={(e) => set({ facebookUrl: e.target.value })} placeholder="https://facebook.com/…" />
            {errs.facebookUrl && <FieldError>{errs.facebookUrl}</FieldError>}
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="wa-extra" hint="ঐচ্ছিক">
              অতিরিক্ত তথ্য
            </FieldLabel>
            <textarea
              id="wa-extra"
              rows={2}
              value={v.extraInfo}
              onChange={(e) => set({ extraInfo: e.target.value })}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <Button type="submit">সেভ করে পরবর্তী ধাপে (লেখার নমুনা)</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (persist()) setSaved(true);
              }}
            >
              সেভ করে পরে সম্পূর্ণ করব
            </Button>
          </div>
          {saved && (
            <div className="sm:col-span-2">
              <div className="rounded-lg border border-brand-line bg-brand-soft px-3 py-2 text-sm text-brand" role="status">
                ✓ আবেদন সেভ হয়েছে (এই ডিভাইসে) — লগইন অবস্থায় <Link to="/writers/apply" className="underline">এই পেজে</Link> ফিরে চালিয়ে যাও।
              </div>
            </div>
          )}
        </form>
      </Card>
      <div className="mt-4">
        <LimitationNote />
      </div>
    </div>
  );
}

/* ───────────────── ২. লেখার নমুনা (/writers/sample) ───────────────── */

function ImagePicker({
  images,
  max,
  onAdd,
  onRemove,
  label,
}: {
  images: string[];
  max: number;
  onAdd: (url: string) => void;
  onRemove: (i: number) => void;
  label: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [imgError, setImgError] = useState<string | null>(null);

  const pick = async (ev: ChangeEvent<HTMLInputElement>) => {
    const files = [...(ev.target.files ?? [])];
    ev.target.value = "";
    setImgError(null);
    for (const f of files) {
      if (images.length >= max) {
        setImgError(`সর্বোচ্চ ${max}টি ছবি যোগ করা যায়।`);
        return;
      }
      try {
        onAdd(await fileToDataUrl(f));
      } catch (err) {
        setImgError(err instanceof Error ? err.message : "ছবি পড়া যায়নি।");
      }
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" type="button" onClick={() => fileRef.current?.click()} disabled={images.length >= max}>
          ছবি যোগ করো ({images.length}/{max})
        </Button>
        <span className="text-xs text-faint">{label}</span>
      </div>
      {imgError && <FieldError>{imgError}</FieldError>}
      {images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {images.map((src, i) => (
            <div key={i} className="relative">
              <img src={src} alt={`ছবি ${i + 1}`} className="h-20 w-28 rounded-lg border border-line object-cover" />
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`ছবি ${i + 1} সরাও`}
                className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-line bg-surface text-xs text-danger hover:bg-danger-soft"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={pick}
      />
    </div>
  );
}

export function SamplePage() {
  const session = useSession();
  const navigate = useNavigate();

  const app = useMemo(() => (session ? applicationForEmail(session.email) : undefined), [session]);
  const initialSample = app ? sampleForApplication(app.id) : undefined;

  const [title, setTitle] = useState(initialSample?.title ?? "");
  const [body, setBody] = useState(initialSample?.body ?? "");
  const [images, setImages] = useState<string[]>(initialSample?.images ?? []);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState<string | null>(null);

  if (!session) {
    return <Navigate to={`/login?next=${encodeURIComponent("/writers/sample")}`} replace />;
  }
  if (!app) {
    return <Navigate to="/writers/apply" replace />;
  }
  if (app.status === "approved") {
    return <Navigate to="/profile?section=writer" replace />;
  }

  const words = wordCount(body);
  const submitted = !!initialSample?.submittedAt;

  const save = (submit: boolean) => {
    setFlash(null);
    if (submit) {
      const nextErrs: Record<string, string> = {};
      if (title.trim().length < 3) nextErrs.title = "নমুনা লেখার একটি শিরোনাম দাও (কমপক্ষে ৩ অক্ষর)।";
      if (words < SAMPLE_MIN_WORDS) nextErrs.body = `লেখা কমপক্ষে ${SAMPLE_MIN_WORDS} শব্দের হতে হবে (এখন ${words})।`;
      setErrs(nextErrs);
      if (Object.keys(nextErrs).length > 0) return;
      upsertSample(app.id, { title: title.trim(), body, images, submit: true });
      navigate("/profile?section=writer", { replace: true });
      return;
    }
    setErrs({});
    upsertSample(app.id, { title: title.trim(), body, images, submit: false });
    setFlash("✓ খসড়া সেভ হয়েছে (এই ডিভাইসে) — আবার লগইন করে চালিয়ে যেতে পারো।");
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">লেখক আবেদন — ধাপ ২</Badge>
          <StatusBadge label={APPLICATION_STATUS_LABEL[app.status]} status={app.status} />
        </div>
        <h1 className="mt-3 font-bnserif text-2xl font-bold">লেখার নমুনা জমা দাও</h1>
        <p className="mt-1 text-sm text-muted">
          একটি পূর্ণ লেখা (নিজের বাছাইয়ের বিষয়ে) জমা দাও — অ্যাডমিন আবেদনফর্মের তথ্যসহ এটি পর্যালোচনা করবেন।
          খসড়া সেভ করে পরে সম্পূর্ণ করা যাবে।
        </p>
        {submitted && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            ⓘ নমুনা আগেই জমা হয়েছে — সিদ্ধান্তের আগে আবেদন ও নমুনা সম্পাদনা করে আবার জমা দেওয়া যায়।
          </div>
        )}

        <div className="mt-5 space-y-5">
          <div>
            <FieldLabel htmlFor="ws-title">শিরোনাম *</FieldLabel>
            <Input id="ws-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="নমুনা লেখার শিরোনাম" />
            {errs.title && <FieldError>{errs.title}</FieldError>}
          </div>
          <div>
            <FieldLabel htmlFor="ws-body" hint={`মোট শব্দ: ${words} · সর্বনিম্ন ${SAMPLE_MIN_WORDS}`}>
              লেখা *
            </FieldLabel>
            <textarea
              id="ws-body"
              rows={16}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="এখানে তোমার পূর্ণ লেখাটি লিখো… প্যারা দুটি খালি লাইন দিয়ে আলাদা করো।"
              className="w-full rounded-lg border border-line bg-surface px-3.5 py-3 text-base leading-8 text-ink placeholder:text-faint"
            />
            {errs.body && <FieldError>{errs.body}</FieldError>}
          </div>
          <div>
            <FieldLabel hint={`সর্বোচ্চ ${MAX_SAMPLE_IMAGES}টি`}>ছবি</FieldLabel>
            <ImagePicker
              images={images}
              max={MAX_SAMPLE_IMAGES}
              onAdd={(url) => setImages((prev) => [...prev, url])}
              onRemove={(i) => setImages((prev) => prev.filter((_, idx) => idx !== i))}
              label="লেখার সাথে যাওয়া ছবি (JPEG/PNG/WebP)"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => save(true)}>
              নমুনা জমা দাও
            </Button>
            <Button type="button" variant="secondary" onClick={() => save(false)}>
              খসড়া সেভ করো
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/writers/apply")}>
              ← আবেদন ফর্ম
            </Button>
          </div>
          {flash && (
            <div className="rounded-lg border border-brand-line bg-brand-soft px-3 py-2 text-sm font-medium text-brand" role="status">
              {flash}
            </div>
          )}
        </div>
      </Card>
      <div className="mt-4">
        <LimitationNote />
      </div>
    </div>
  );
}

/* ───────────────── ৩. আমার আর্টিকেল (/writers/articles) ───────────────── */

/** অনুমোদিত লেখক কি না — টাইপ শুধু রক্ষার জন্য */
type ApprovedWriterGate = {
  ok: boolean;
  app?: WriterApplication;
};

function approvedWriterGate(email: string): ApprovedWriterGate {
  const app = applicationForEmail(email);
  return { ok: app?.status === "approved", app };
}

function NotApprovedWriterCard() {
  return (
    <Card className="mx-auto max-w-xl p-6 text-center">
      <h1 className="font-bnserif text-xl font-bold">লেখকের টুল এখন তোমার জন্য খোলা নয়</h1>
      <p className="mt-2 text-sm text-muted">
        লেখা ও আর্টিকেল জমা দিতে হলে আগে লেখক আবেদন অনুমোদিত হওয়া দরকার।
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <ButtonLink to="/writers/apply">লেখক হোন</ButtonLink>
        <ButtonLink to="/profile?section=writer" variant="secondary">
          প্রোফাইলে স্ট্যাটাস দেখো
        </ButtonLink>
      </div>
    </Card>
  );
}

export function MyArticlesPage() {
  const session = useSession();
  const writable = useWriters();
  const navigate = useNavigate();

  if (!session) {
    return <Navigate to={`/login?next=${encodeURIComponent("/writers/articles")}`} replace />;
  }

  const gate = approvedWriterGate(session.email);
  if (!gate.ok) return <NotApprovedWriterCard />;

  // reactive snapshot — status updates render immediately
  const mine = writable.articles.filter((a) => a.accountEmail === session.email).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-bnserif text-2xl font-bold">আমার আর্টিকেল</h1>
          <p className="mt-1 text-sm text-muted">
            সব স্ট্যাটাস একসাথে — খসড়া, রিভিউয়ের অপেক্ষায়, প্রকাশিত ও পরিবর্তন-প্রয়োজন।
          </p>
        </div>
        <ButtonLink to="/writers/articles/new">নতুন আর্টিকেল লিখুন</ButtonLink>
      </div>

      {mine.length === 0 ? (
        <div className="mt-5">
          <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
            <p className="font-medium text-ink">এখনো কোনো আর্টিকেল নেই</p>
            <p className="mt-1 text-sm text-muted">"নতুন আর্টিকেল লিখুন" চেপে শুরু করো।</p>
            <div className="mt-4 flex justify-center">
              <ButtonLink to="/writers/articles/new">নতুন আর্টিকেল লিখুন</ButtonLink>
            </div>
          </div>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {mine.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3">
              <img
                src={a.cover || a.images[0] || ""}
                alt=""
                className="h-14 w-20 shrink-0 rounded-lg border border-line object-cover"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{a.title || "শিরোনামহীন খসড়া"}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-faint">
                  <StatusBadge label={ARTICLE_STATUS_LABEL[a.status]} status={a.status} />
                  {(a.status === "changes-requested" || a.status === "rejected") && (
                    <span>অ্যাডমিন নোট: {a.reviewNote ?? "—"}</span>
                  )}
                  {a.status === "published" && (
                    <Link to={`/articles/${a.slug}`} className="text-brand hover:underline">
                      প্রকাশিত দেখো →
                    </Link>
                  )}
                </p>
              </div>
              {a.images.length > 0 && <span className="text-xs text-faint">🖼 {a.images.length}</span>}
              {articleEditableByStatus(a.status) && (
                <button
                  type="button"
                  onClick={() => navigate(`/writers/articles/${a.id}`)}
                  className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink transition-colors hover:bg-surface-2"
                >
                  সম্পাদনা
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <LimitationNote />
      </div>
    </div>
  );
}

/* ───────────────── ৪. আর্টিকেল সম্পাদক (/writers/articles/new, /writers/articles/:id) ───────────────── */

type EditorState = { title: string; cover: string; categorySlug: string; body: string; images: string[] };

export function ArticleEditorPage() {
  const session = useSession();
  const writable = useWriters();
  const params = useParams<{ id?: string }>();

  const isNew = !params.id || params.id === "new";

  if (!session) {
    const next = isNew ? "/writers/articles/new" : `/writers/articles/${params.id}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  const gate = approvedWriterGate(session.email);
  if (!gate.ok) return <NotApprovedWriterCard />;

  if (isNew) {
    // নষ্ট একই খালি খসড়া বার বার তৈরি এড়াতে: তাজা খালি খসড়া থাকলে সেটিই খোলো
    const mine = writable.articles.filter((a) => a.accountEmail === session.email);
    const emptyDraft = mine.find((a) => a.status === "draft" && !a.title.trim() && !a.body.trim());
    if (emptyDraft) {
      return <Navigate to={`/writers/articles/${emptyDraft.id}`} replace />;
    }
    return <Navigate to={`/writers/articles/${newArticle(session.email, gate.app!.displayName).id}`} replace />;
  }

  const article = articleById(params.id!);
  if (!article || article.accountEmail !== session.email) {
    return (
      <Card className="mx-auto max-w-xl p-6 text-center">
        <h1 className="font-bnserif text-xl font-bold">আর্টিকেল পাওয়া যায়নি</h1>
        <div className="mt-4 flex justify-center gap-2">
          <ButtonLink to="/writers/articles" variant="secondary">
            আমার আর্টিকেল
          </ButtonLink>
        </div>
      </Card>
    );
  }

  if (!articleEditableByStatus(article.status)) {
    return (
      <Card className="mx-auto max-w-2xl p-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={ARTICLE_STATUS_LABEL[article.status]} status={article.status} />
        </div>
        <h1 className="mt-3 font-bnserif text-xl font-bold">{article.title || "(শিরোনাম নেই)"}</h1>
        <p className="mt-2 text-sm text-muted">
          {article.status === "published"
            ? "এই আর্টিকেল প্রকাশিত — প্রকাশিত লেখা লেখক দ্বারা আর সম্পাদনা করা যায় না।"
            : "এই আর্টিকেল রিভিউয়ের অপেক্ষায় — অ্যাডমিন সিদ্ধান্তের আগে সম্পাদনা বন্ধ থাকে।"}
        </p>
        {article.reviewNote && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            অ্যাডমিন নোট: {article.reviewNote}
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <ButtonLink to="/writers/articles" variant="secondary">
            আমার আর্টিকেল
          </ButtonLink>
          {article.status === "published" && (
            <ButtonLink to={`/articles/${article.slug}`}>প্রকাশিত দেখো →</ButtonLink>
          )}
        </div>
      </Card>
    );
  }

  return <ArticleEditorInner key={article.id} article={article} />;
}

function ArticleEditorInner({ article }: { article: WriterArticle }) {
  const navigate = useNavigate();
  const [v, setV] = useState<EditorState>({
    title: article.title,
    cover: article.cover,
    categorySlug: article.categorySlug,
    body: article.body,
    images: article.images,
  });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState<string | null>(null);
  const set = (patch: Partial<EditorState>) => setV((prev) => ({ ...prev, ...patch }));

  const persist = (submit: boolean): boolean => {
    const nextErrs: Record<string, string> = {};
    if (v.title.trim().length < 5) nextErrs.title = "শিরোনাম কমপক্ষে ৫ অক্ষরের দাও।";
    if (!v.categorySlug) nextErrs.categorySlug = "আর্টিকেলের ক্যাটেগরি বাছো।";
    if (!v.body.trim()) nextErrs.body = "আর্টিকেলের লেখাটি লিখো।";
    if (v.images.length > MAX_ARTICLE_IMAGES) nextErrs.images = `সর্বোচ্চ ${MAX_ARTICLE_IMAGES}টি ছবি।`;
    setErrs(nextErrs);
    if (Object.keys(nextErrs).length > 0 && submit) return false;
    saveArticle(
      article.id,
      { title: v.title.trim(), cover: v.cover, categorySlug: v.categorySlug, body: v.body, images: v.images },
      submit ? "submit" : "draft",
    );
    setFlash(submit ? "✓ রিভিউয়ের জন্য জমা হয়েছে — অনুমোদনের আগে প্রকাশিত হবে না।" : "✓ খসড়া সেভ হয়েছে (এই ডিভাইসে)।");
    return true;
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">আর্টিকেল লিখুন</Badge>
          <StatusBadge label={ARTICLE_STATUS_LABEL[article.status]} status={article.status} />
        </div>
        <h1 className="mt-3 font-bnserif text-2xl font-bold">
          {article.title.trim() ? "আর্টিকেল সম্পাদনা" : "নতুন আর্টিকেল"}
        </h1>
        {(article.status === "changes-requested" || article.status === "rejected") && article.reviewNote && (
          <div className="mt-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            অ্যাডমিন অনুরোধ: {article.reviewNote} — ঠিক করে আবার জমা দাও।
          </div>
        )}

        <div className="mt-5 space-y-5">
          <div>
            <FieldLabel htmlFor="ae-title">শিরোনাম *</FieldLabel>
            <Input id="ae-title" value={v.title} onChange={(e) => set({ title: e.target.value })} />
            {errs.title && <FieldError>{errs.title}</FieldError>}
          </div>
          <div>
            <FieldLabel hint="ঐচ্ছিক — না দিলে কভার নমুনা-কভার হবে">কভার ছবি</FieldLabel>
            <ImagePicker
              images={v.cover ? [v.cover] : []}
              max={1}
              onAdd={(url) => set({ cover: url })}
              onRemove={() => set({ cover: "" })}
              label="আর্টিকেলের কভার"
            />
          </div>
          <div>
            <FieldLabel htmlFor="ae-cat">ক্যাটেগরি *</FieldLabel>
            <select
              id="ae-cat"
              value={v.categorySlug}
              onChange={(e) => set({ categorySlug: e.target.value })}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
            >
              <option value="">— বাছো —</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-faint">সাইটের বিদ্যমান ক্যাটেগরি সিস্টেম থেকেই বাছাই।</p>
            {errs.categorySlug && <FieldError>{errs.categorySlug}</FieldError>}
          </div>
          <div>
            <FieldLabel htmlFor="ae-body" hint={`মোট শব্দ: ${wordCount(v.body)}`}>
              মূল লেখা *
            </FieldLabel>
            <textarea
              id="ae-body"
              rows={16}
              value={v.body}
              onChange={(e) => set({ body: e.target.value })}
              placeholder="এখানে আর্টিকেলটি লিখো… প্যারা দুটি খালি লাইন দিয়ে আলাদা করো।"
              className="w-full rounded-lg border border-line bg-surface px-3.5 py-3 text-base leading-8 text-ink placeholder:text-faint"
            />
            {errs.body && <FieldError>{errs.body}</FieldError>}
          </div>
          <div>
            <FieldLabel hint={`সর্বোচ্চ ${MAX_ARTICLE_IMAGES}টি`}>লেখার মধ্যে ছবি</FieldLabel>
            <ImagePicker
              images={v.images}
              max={MAX_ARTICLE_IMAGES}
              onAdd={(url) => set({ images: [...v.images, url] })}
              onRemove={(i) => set({ images: v.images.filter((_, idx) => idx !== i) })}
              label="লেখার সাথে যাওয়া ছবি (JPEG/PNG/WebP)"
            />
            {errs.images && <FieldError>{errs.images}</FieldError>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => persist(true)}>
              রিভিউয়ের জন্য জমা দাও
            </Button>
            <Button type="button" variant="secondary" onClick={() => persist(false)}>
              খসড়া সেভ করো
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/writers/articles")}>
              ← আমার আর্টিকেল
            </Button>
          </div>
          {flash && (
            <div className="rounded-lg border border-brand-line bg-brand-soft px-3 py-2 text-sm font-medium text-brand" role="status">
              {flash}
            </div>
          )}
        </div>
      </Card>
      <div className="mt-4">
        <LimitationNote />
      </div>
    </div>
  );
}

/* ───────────────── ৫. অ্যাডমিন রিভিউ (/admin/writers) ───────────────── */

export function AdminWritersPage() {
  const { unlocked, lock } = useAdminAccess();
  const writable = useWriters();

  if (!unlocked) return <AdminGate title="লেখক ম্যানেজমেন্ট (অ্যাডমিন)" />;

  const waiting = writable.applications
    .filter((a) => a.status === "submitted" || a.status === "under-review")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const decided = writable.applications
    .filter((a) => a.status === "approved" || a.status === "rejected")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const articlesInReview = writable.articles
    .filter((a) => a.status === "pending")
    .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-bnserif text-2xl font-bold">অ্যাডমিন — লেখক রিভিউ</h1>
          <p className="mt-1 text-sm text-muted">
            লেখক আবেদন ও জমা হওয়া আর্টিকেল যাচাই করে সিদ্ধান্ত নাও — অনুমোদন/প্রত্যাখ্যান কেবল এই পেজ থেকে।
          </p>
        </div>
        <button onClick={lock} className="text-xs font-medium text-muted hover:text-ink">
          ⌨️ অ্যাডমিন সেশন লক করো
        </button>
      </div>

      <section className="mt-5">
        <h2 className="font-bnserif mb-3 text-lg font-bold">আবেদন (চলমান) — {waiting.length}</h2>
        {waiting.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-8 text-center text-sm text-muted">
            এখনো কোনো আবেদন রিভিউয়ের অপেক্ষায় নেই।
          </div>
        ) : (
          <ul className="space-y-3">
            {waiting.map((a) => (
              <ApplicationReviewRow key={a.id} app={a} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-bnserif mb-3 text-lg font-bold">আর্টিকেল (রিভিউয়ের অপেক্ষায়) — {articlesInReview.length}</h2>
        {articlesInReview.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-8 text-center text-sm text-muted">
            রিভিউয়ের অপেক্ষায় কোনো আর্টিকেল নেই।
          </div>
        ) : (
          <ul className="space-y-3">
            {articlesInReview.map((a) => (
              <ArticleReviewRow key={a.id} article={a} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-bnserif mb-3 text-lg font-bold">সিদ্ধান্ত নেওয়া আবেদন</h2>
        {decided.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-8 text-center text-sm text-muted">
            এখনো কোনো সিদ্ধান্ত নেওয়া হয়নি।
          </div>
        ) : (
          <ul className="space-y-2">
            {decided.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-3 text-sm">
                <span className="font-semibold">{a.fullName}</span>
                <span className="text-faint">({a.displayName})</span>
                <StatusBadge label={APPLICATION_STATUS_LABEL[a.status]} status={a.status} />
                {a.status === "rejected" && a.reviewNote && <span className="text-xs text-danger">কারণ: {a.reviewNote}</span>}
                {a.status === "approved" && (
                  <button
                    type="button"
                    onClick={() => setApplicationStatus(a.id, "under-review", null)}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    সিদ্ধান্ত বদলাও
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6">
        <LimitationNote />
      </div>
    </div>
  );
}

function ApplicationReviewRow({ app }: { app: WriterApplication }) {
  const sample = sampleForApplication(app.id);
  const words = sample ? wordCount(sample.body) : 0;
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label={APPLICATION_STATUS_LABEL[app.status]} status={app.status} />
        <span className="font-bnserif font-bold">{app.fullName}</span>
        <span className="text-sm text-faint">({app.displayName})</span>
        <span className="text-xs text-faint">· {app.contactEmail} · {app.mobile}</span>
        <span className="ml-auto text-xs text-faint">{new Date(app.updatedAt).toLocaleString("bn-BD")}</span>
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>বায়ো: {app.bio}</div>
        <div>শিক্ষা: {app.education}{app.institution ? ` — ${app.institution}` : ""}</div>
        <div>পেশা: {app.profession}{app.workplace ? ` — ${app.workplace}` : ""}</div>
        <div>অভিজ্ঞতা: {app.experience}</div>
        <div>বিশেষজ্ঞ: {app.expertise}</div>
        <div>ক্যাটেগরি: {app.categorySlug}</div>
        {app.publishedLink && (
          <div className="sm:col-span-2">
            প্রকাশিত লেখা:{" "}
            <a href={app.publishedLink} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
              {app.publishedLink}
            </a>
          </div>
        )}
        <div className="sm:col-span-2">
          ফেসবুক:{" "}
          <a href={app.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
            {app.facebookUrl}
          </a>
        </div>
        {app.extraInfo && <div className="sm:col-span-2">অতিরিক্ত: {app.extraInfo}</div>}
      </dl>

      {sample && (
        <details className="mt-3 rounded-lg border border-line bg-surface-2/60 px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">
            📝 লেখার নমুনা — {sample.title || "(শিরোনাম নেই)"} · শব্দ: {words}
            {sample.submittedAt ? "" : " · খসড়া (জমা হয়নি)"}
          </summary>
          <div className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-7">{sample.body || "—"}</div>
          {sample.images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {sample.images.map((src, i) => (
                <img key={i} src={src} alt={`নমুনা ছবি ${i + 1}`} className="h-20 w-28 rounded-lg border border-line object-cover" />
              ))}
            </div>
          )}
        </details>
      )}
      {!sample && (
        <p className="mt-3 rounded-lg border border-line bg-amber-50 px-3 py-2 text-xs text-amber-900">
          যাচাইয়ের নোট: এই অ্যাকান্টে এখনো লেখার নমুনা জমা হয়নি — নমুনা ছাড়া সিদ্ধান্ত নেওয়া উচিত নয়।
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setApplicationStatus(app.id, "approved", null)}>
          ✓ অনুমোদন (লেখক হিসেবে)
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setApplicationStatus(app.id, "under-review", null)}>
          রিভিউ চলছে
        </Button>
        <Button size="sm" variant="danger" onClick={() => setRejecting(!rejecting)}>
          ✕ প্রত্যাখ্যান
        </Button>
      </div>
      {rejecting && (
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!note.trim()) return;
            setApplicationStatus(app.id, "rejected", note.trim());
            setNote("");
            setRejecting(false);
          }}
        >
          <label className="mb-1 block text-sm font-medium">প্রত্যাখ্যানের কারণ (লেখকের কাছে দেখাবে) *</label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            placeholder="কারণ লিখো — লেখক আবেদন সম্পাদনা করে আবার জমা দিতে পারবে।"
          />
          <div className="mt-2">
            <Button size="sm" variant="danger" type="submit" disabled={!note.trim()}>
              প্রত্যাখ্যান নিশ্চিত করো
            </Button>
          </div>
        </form>
      )}
    </li>
  );
}

function ArticleReviewRow({ article }: { article: WriterArticle }) {
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"changes" | "reject" | null>(null);

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label={ARTICLE_STATUS_LABEL[article.status]} status={article.status} />
        <span className="font-bnserif font-bold">{article.title}</span>
        <span className="text-sm text-faint">
          লেখক: {article.authorDisplayName} ({article.accountEmail})
        </span>
      </div>
      <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-line bg-surface-2/60 px-3 py-2 text-sm leading-7 whitespace-pre-wrap">
        {article.body || "—"}
      </div>
      {article.images.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {article.images.map((src, i) => (
            <img key={i} src={src} alt={`ছবি ${i + 1}`} className="h-20 w-28 rounded-lg border border-line object-cover" />
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => reviewArticle(article.id, "published", null)}>
          ✓ প্রকাশ করো
        </Button>
        <Button size="sm" variant="secondary" onClick={() => { setMode("changes"); setNote(""); }}>
          পরিবর্তন চাও
        </Button>
        <Button size="sm" variant="danger" onClick={() => { setMode("reject"); setNote(""); }}>
          ✕ প্রত্যাখ্যান
        </Button>
      </div>
      {mode && (
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!note.trim()) return;
            reviewArticle(article.id, mode === "changes" ? "changes-requested" : "rejected", note.trim());
            setNote("");
            setMode(null);
          }}
        >
          <label className="mb-1 block text-sm font-medium">
            {mode === "changes" ? "পরিবর্তনের নির্দেশনা (লেখকের কাছে দেখাবে) *" : "প্রত্যাখ্যানের কারণ (লেখকের কাছে দেখাবে) *"}
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
          />
          <div className="mt-2 flex gap-2">
            <Button size="sm" type="submit" disabled={!note.trim()}>
              {mode === "changes" ? "পরিবর্তনের অনুরোধ পাঠাও" : "প্রত্যাখ্যান করো"}
            </Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => setMode(null)}>
              বাতিল
            </Button>
          </div>
        </form>
      )}
    </li>
  );
}
