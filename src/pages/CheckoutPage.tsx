import { useState, type ChangeEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { PaymentMethodCard } from "../components/PaymentMethodCards";
import {
  createPaymentRequest,
  contentTypeLabelBn,
  fmtDateTime,
  loadProviders,
  lookupContentItem,
  validatePaymentDraft,
  type ContentItem,
  type ContentType,
  type PaymentFormDraft,
  type PaymentRequest,
} from "../lib/payments";
import { sampleCover } from "../data/sample";

/* ───────────── হেল্পার ───────────── */

function bnNum(n: number) {
  return n.toLocaleString("bn-BD", { useGrouping: false });
}

/** লোকাল প্রোফাইল — auth ব্যাকএন্ড Phase 2 */
function profileEmail(): string | null {
  try {
    const raw = localStorage.getItem("brm-profile-v1");
    if (!raw) return null;
    const p = JSON.parse(raw) as { email?: unknown; name?: unknown };
    return typeof p.email === "string" && p.email ? p.email : null;
  } catch {
    return null;
  }
}

function contentCover(item: ContentItem): string {
  return item.cover?.trim() || sampleCover(`buy-${item.slug}`);
}

const STEP_LABELS = [
  "সারসংক্ষেপ",
  "মেথড নির্বাচন",
  "নির্দেশনা",
  "তথ্য ফর্ম",
  "রিভিউ",
  "নিশ্চিতকরণ",
];

const inputCls =
  "h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-faint focus:border-brand";

/**
 * ভুল তালিকা — প্রতিটি ধাপে দেখা যায়।
 * আগে এটি শুধু ফর্ম-ধাপে (৩) রেন্ডার হতো, তাই ধাপ ২-এ ভুল হলে বাটন চেপে
 * কিছুই ঘটত না ও কোনো বার্তা দেখা যেত না।
 */
function ErrorList({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <div className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
      <ul className="list-inside list-disc space-y-1">
        {errors.map((er) => (
          <li key={er}>{er}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * অ্যাডমিন প্রোভাইডার-নির্দিষ্ট নির্দেশনা (`provider.instructions`) কনফিগার না করলে ব্যবহৃত
 * নিরপেক্ষ ডিফল্ট ধাপ — প্রাপক নম্বর ও হুবহু অ্যামাউন্ট ছাড়া কিছুই নিজে থেকে ধরে নেওয়া হয় না
 * (কোনো ফি/সমর্থিত মেথড/নিয়ম আবিষ্কার করা হয় না)।
 */
function fallbackSteps(amountBn: string, recipientNumber: string): string[] {
  return [
    `প্রাপক নম্বর: ${recipientNumber} — অ্যাডমিন এই নম্বরটিই কনফিগার করেছেন।`,
    `ঠিক ৳ ${amountBn} পাঠাও (কম বা বেশি নয়)।`,
    "যে মেথডটি অ্যাডমিন নিশ্চিত করেছেন সেটিই ব্যবহার করো; এখনো যাচাই না হলে অ্যাডমিনের কাছে জেনে নাও।",
    "পাঠানোর পর লেনদেনের TrxID/রেফারেন্স ও সেন্ডার নম্বর সংরক্ষণ করো।",
    "নিচের ধাপে সেই তথ্য দিয়ে পেমেন্ট রিকোয়েস্ট জমা দাও — জমা দিলেই অ্যাক্সেস আসে না, অ্যাডমিন অনুমোদন করলে আসে।",
  ];
}

/** একটিমাত্র রিইউজেবল ফ্লো — আর্টিকেল/বই/কোর্স সব কেনায় */
export function CheckoutFlow({ type, slug }: { type: ContentType; slug: string }) {
  const [step, setStep] = useState(0);
  const [providers] = useState(() => loadProviders());
  const [draft, setDraft] = useState<PaymentFormDraft>({
    providerId: "bkash",
    fullName: "",
    customerMobile: "",
    senderMobile: "",
    txnId: "",
    amount: "",
    screenshot: null,
  });
  const [shotName, setShotName] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<PaymentRequest | null>(null);
  const [doneWarning, setDoneWarning] = useState<string | null>(null);

  const item = lookupContentItem(type, slug);
  const accountEmail = profileEmail();

  if (!item) return <Navigate to={type === "course" ? "/courses" : type === "book" ? "/books" : "/premium"} replace />;

  const provider = providers.find((p) => p.id === draft.providerId)!;
  const anyVerified = providers.some((p) => p.verified);

  const set = (patch: Partial<PaymentFormDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const pickScreenshot = (e: ChangeEvent<HTMLInputElement>) => {
    setErrors([]);
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setErrors(["স্ক্রিনশট: শুধু JPG, JPEG, PNG বা WebP ফাইল দেওয়া যাবে।"]);
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      setErrors(["স্ক্রিনশট সর্বোচ্চ ২ MB — ছোট করে আবার দাও।"]);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        set({ screenshot: reader.result });
        setShotName(f.name);
      }
    };
    reader.readAsDataURL(f);
  };

  const goReview = () => {
    const errs = validatePaymentDraft(type, slug, draft, providers);
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setStep(4);
  };

  /** জমা: ডাবল-সাবমিট গার্ড (busy) + সেভ ব্যর্থ হলে নিরাপদ রিট্রাই */
  const submit = () => {
    if (busy) return;
    setBusy(true);
    setErrors([]);
    try {
      const res = createPaymentRequest(type, slug, draft, accountEmail);
      if (!res.ok) {
        setErrors(res.errors);
        setBusy(false);
        return;
      }
      setDone(res.request);
      setDoneWarning(res.screenshotWarning ?? null);
      setStep(5);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="mx-auto max-w-2xl">
      <nav aria-label="ব্রেডক্রাম্ব" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link to="/" className="hover:text-brand">হোম</Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link to={`/checkout/${type}/${slug}`} className="hover:text-brand">
              পেমেন্ট
            </Link>
          </li>
        </ol>
      </nav>

      <h1 className="font-bnserif mt-3 text-2xl font-bold">পেমেন্ট করে কেনা</h1>
      <p className="mt-1.5 text-sm text-muted">
        নির্দিষ্ট {contentTypeLabelBn(type)} — <strong>{item.title}</strong>
      </p>

      {/* স্টেপার */}
      <ol className="mt-4 flex gap-1 overflow-x-auto no-scrollbar text-[11px]" aria-label="পেমেন্ট প্রক্রিয়ার ধাপ">
        {STEP_LABELS.map((label, i) => (
          <li key={label} className="flex shrink-0 items-center gap-1">
            <span
              className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
                i < step ? "bg-brand text-white" : i === step ? "border-2 border-brand text-brand" : "border border-line text-faint"
              }`}
            >
              {i < step ? "✓" : bnNum(i + 1)}
            </span>
            <span className={i === step ? "font-semibold text-brand" : "text-faint"}>{label}</span>
            {i < STEP_LABELS.length - 1 && <span className="px-0.5 text-line">—</span>}
          </li>
        ))}
      </ol>

      {/* ধাপ ১: সারসংক্ষেপ */}
      {step === 0 && (
        <section className="mt-5 rounded-2xl border border-line bg-surface shadow-sm p-6">
          <div className="flex gap-4">
            <img src={contentCover(item)} alt="" className="h-24 w-16 shrink-0 rounded-lg object-cover sm:h-32 sm:w-22" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-faint">
                {contentTypeLabelBn(type)}
              </p>
              <h2 className="font-bnserif text-lg font-bold leading-snug">{item.title}</h2>
              <p className="mt-1 font-bnserif text-xl font-bold text-brand">৳ {bnNum(item.price)}</p>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            ⓘ জমা দেওয়ার পরেই কনটেন্ট আনলক হবে <strong>না</strong> — পেমেন্ট ম্যানুয়ালি যাচাই করে
            অ্যাডমিন অনুমোদন করলে তবেই অ্যাক্সেস যুক্ত হবে।
          </div>
          {accountEmail ? (
            <p className="mt-3 text-sm text-muted">অ্যাকাউন্ট: {accountEmail} — এই কেনা এই অ্যাকাউন্টে যুক্ত হবে।</p>
          ) : (
            <p className="mt-3 text-sm text-muted">
              লোকাল অ্যাকাউন্ট পাওয়া যায়নি — অ্যাকাউন্ট যুক্ত করতে{" "}
              <Link to="/login" className="text-brand hover:underline">লগইন/সাইনআপ</Link> ব্যবহার করো
              (auth ব্যাকএন্ড Phase 2)। আপাতত কেনা ইমেইল ছাড়া জমা দেওয়া যাবে; অ্যাডমিন অনুমোদনের পর
              ফর্মের নাম/মোবাইল ধরে মেলানো হবে।
            </p>
          )}
          <button
            onClick={() => {
              setErrors([]);
              setStep(1);
            }}
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-red-600 text-sm font-bold text-white transition-colors hover:bg-red-700"
          >
            পেমেন্ট মেথড নির্বাচন →
          </button>
        </section>
      )}

      {/* ধাপ ২: মেথড নির্বাচন */}
      {step === 1 && (
        <section className="mt-5 space-y-3">
          <p className="text-sm text-muted">
            তিনটি মেথডের যেকোনো একটি বেছে নাও — কার্ডে ক্লিক করলেই সেটি নির্বাচিত হয় এবং পরের ধাপের
            তথ্য ও নির্দেশনা ঠিক সেই মেথডের জন্য দেখানো হয়।
          </p>
          {!anyVerified && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              ⓘ প্রাপক নম্বর ({provider.recipientNumber}) তিনটি কার্ডেই কনফিগার করা আছে, কিন্তু কোনো
              প্রোভাইডারের রিসিভিং মেথড এখনো অ্যাডমিন-যাচাই করা হয়নি। তাই বাস্তব টাকা পাঠানোর আগে অ্যাডমিন
              যাচাই করুক — স্বয়ংক্রিয়ভাবে যাচাই হয়েছে বলে দাবি করা হয় না।
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            {providers.map((p) => (
              <PaymentMethodCard
                key={p.id}
                provider={p}
                selected={draft.providerId === p.id}
                disabled={false}
                onSelect={(id) => set({ providerId: id })}
              />
            ))}
          </div>
          <ErrorList errors={errors} />
          <div className="flex gap-2">
            <button onClick={() => setStep(0)} className="rounded-lg border border-line bg-surface px-4 py-2 text-sm">
              ← পেছনে
            </button>
            <button
              onClick={() => {
                setErrors([]);
                setStep(2);
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              নির্দেশনা দেখো →
            </button>
          </div>
        </section>
      )}

      {/* ধাপ ৩: নির্দেশনা */}
      {step === 2 && (
        <section className="mt-5 rounded-2xl border border-line bg-surface shadow-sm p-6">
          <h2 className="font-bnserif text-lg font-bold">পেমেন্ট নির্দেশনা — {provider.nameBn}</h2>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="rounded-lg border border-line bg-surface-2/60 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-faint">প্রাপক নম্বর</dt>
              <dd className="mt-1 flex items-center gap-2">
                <strong className="text-base tracking-wide">{provider.recipientNumber}</strong>
                <PaymentMethodCardCopyHelper number={provider.recipientNumber} />
              </dd>
            </div>
            <div className="rounded-lg border border-line bg-surface-2/60 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-faint">মূল্য (হুবহু)</dt>
              <dd className="mt-1 font-bnserif text-lg font-bold text-brand">৳ {bnNum(item.price)}</dd>
            </div>
            <div className="rounded-lg border border-line bg-surface-2/60 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-faint">সমর্থিত লেনদেন মেথড</dt>
              <dd className="mt-1">
                {provider.method ?? "অ্যাডমিন এখনো নিশ্চিত করেননি — নিজে থেকে কোনো মেথড ধরে নেওয়া হয় না"}
              </dd>
            </div>
          </dl>
          {!provider.verified && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              ⚠ {provider.nameBn}: রিসিভিং মেথড এখনো অ্যাডমিন-যাচাই করা হয়নি। নিচের ধাপগুলো নিরপেক্ষ ডিফল্ট;
              অ্যাডমিন যাচাই করার আগে বাস্তব টাকা পাঠানো ঠিক হবে না।
            </p>
          )}
          <div className="mt-4 space-y-1.5 rounded-lg border border-line p-4 text-sm text-muted">
            {(provider.instructions ?? fallbackSteps(bnNum(item.price), provider.recipientNumber).join("\n"))
              .split("\n")
              .map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            <p className="font-semibold text-ink">
              আগে বাস্তবে টাকা পাঠিয়ে রেফারেন্স কোড পেয়ে রাখো — তারপর তথ্য জমা দাও।
            </p>
          </div>
          <p className="mt-3 text-xs text-faint">
            প্রোভাইডার-ভিত্তিক ফি/নিয়ম এখানে আবিষ্কার করা হয়নি — অ্যাডমিন কনফিগার করা নির্দেশনাই চূড়ান্ত।
          </p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setStep(1)} className="rounded-lg border border-line bg-surface px-4 py-2 text-sm">
              ← পেছনে
            </button>
            <button
              onClick={() => setStep(3)}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              টাকা পাঠিয়েছি — তথ্য জমা দেব →
            </button>
          </div>
        </section>
      )}

      {/* ধাপ ৪: তথ্য ফর্ম */}
      {step === 3 && (
        <form
          className="mt-5 space-y-4 rounded-2xl border border-line bg-surface shadow-sm p-6"
          onSubmit={(e) => {
            e.preventDefault();
            goReview();
          }}
          noValidate
        >
          <div className="rounded-lg border border-line bg-surface-2/60 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-faint">যে কনটেন্ট কিনছো</p>
            <p className="mt-1 font-medium">
              {contentTypeLabelBn(type)} — {item.title}
            </p>
            <p className="mt-0.5 font-bnserif text-base font-bold text-brand">৳ {bnNum(item.price)}</p>
            <p className="mt-1 text-xs text-faint">
              মেথড: {provider.nameBn} · প্রাপক নম্বর: {provider.recipientNumber}
            </p>
          </div>
          <div>
            <label htmlFor="pm-name" className="mb-1 block text-sm font-medium">পুরো নাম *</label>
            <input id="pm-name" className={inputCls} value={draft.fullName} onChange={(e) => set({ fullName: e.target.value })} placeholder="তোমার পুরো নাম" />
          </div>
          <div>
            <label htmlFor="pm-mobile" className="mb-1 block text-sm font-medium">নিজের মোবাইল নম্বর *</label>
            <input id="pm-mobile" inputMode="numeric" className={inputCls} value={draft.customerMobile} onChange={(e) => set({ customerMobile: e.target.value })} placeholder="01XXXXXXXXX" />
          </div>
          <div>
            <label htmlFor="pm-sender" className="mb-1 block text-sm font-medium">যে নম্বর থেকে টাকা পাঠিয়েছো (সেন্ডার) * — অথবা নম্বরের শেষ ৪ ডিজিট</label>
            <input id="pm-sender" inputMode="numeric" className={inputCls} value={draft.senderMobile} onChange={(e) => set({ senderMobile: e.target.value })} placeholder="01XXXXXXXXX" />
          </div>
          <div>
            <label htmlFor="pm-txn" className="mb-1 block text-sm font-medium">ট্রানজেকশন আইডি / রেফারেন্স কোড *</label>
            <input id="pm-txn" className={inputCls} value={draft.txnId} onChange={(e) => set({ txnId: e.target.value })} placeholder="যেমন: 8A4X2Y91ZZ" />
          </div>
          <div>
            <label htmlFor="pm-amount" className="mb-1 block text-sm font-medium">পাঠানো অ্যামাউন্ট (৳) * — হুবহু ৳ {bnNum(item.price)}</label>
            <input id="pm-amount" inputMode="numeric" className={inputCls} value={draft.amount} onChange={(e) => set({ amount: e.target.value })} placeholder={String(item.price)} />
          </div>
          <div>
            <label htmlFor="pm-shot" className="mb-1 block text-sm font-medium">পেমেন্ট স্ক্রিনশট (ঐচ্ছিক)</label>
            <input id="pm-shot" type="file" accept="image/jpeg,image/png,image/webp" onChange={pickScreenshot} className={inputCls} />
            <p className="mt-1 text-xs text-faint">JPG/JPEG/PNG/WebP · সর্বোচ্চ ২ MB · স্ক্রিনশট = পেমেন্টের অটো-প্রমাণ নয়</p>
            {draft.screenshot && (
              <div className="mt-2 inline-flex flex-col gap-1.5">
                <img src={draft.screenshot} alt="পেমেন্ট স্ক্রিনশট প্রিভিউ" className="h-40 w-auto rounded-lg border border-line object-contain" />
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => set({ screenshot: null })}
                    className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-2"
                  >
                    স্ক্রিনশট সরাও
                  </button>
                  <label htmlFor="pm-shot" className="cursor-pointer rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-2">
                    বদলাও / নতুন
                  </label>
                </span>
                {shotName && <span className="text-xs text-faint">{shotName}</span>}
              </div>
            )}
          </div>

          <ErrorList errors={errors} />

          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(2)} className="rounded-lg border border-line bg-surface px-4 py-2 text-sm">
              ← পেছনে
            </button>
            <button type="submit" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">
              রিভিউ করো →
            </button>
          </div>
        </form>
      )}

      {/* ধাপ ৫: রিভিউ */}
      {step === 4 && (
        <section className="mt-5 rounded-2xl border border-line bg-surface shadow-sm p-6">
          <h2 className="font-bnserif text-lg font-bold">রিভিউ — ঠিক আছে কি না মিলিয়ে নাও</h2>
          <dl className="mt-3 grid gap-2 text-sm">
            {[
              ["কনটেন্ট", `${contentTypeLabelBn(type)} — ${item.title}`],
              ["মূল্য", `৳ ${bnNum(item.price)}`],
              ["প্রোভাইডার", provider.nameBn],
              ["প্রাপক নম্বর", provider.recipientNumber],
              ["নাম", draft.fullName],
              ["নিজের মোবাইল", draft.customerMobile],
              ["সেন্ডার নম্বর", draft.senderMobile],
              ["ট্রানজেকশন আইডি", draft.txnId],
              ["পাঠানো অ্যামাউন্ট", `৳ ${draft.amount}`],
              ["স্ক্রিনশট", draft.screenshot ? "দেওয়া হয়েছে" : "দেওয়া হয়নি"],
              ["অ্যাকাউন্ট", accountEmail ?? "— (লোকাল অ্যাকাউন্ট নেই)"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 rounded-lg border border-line bg-surface-2/60 p-2.5">
                <dt className="text-faint">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setStep(3)} className="rounded-lg border border-line bg-surface px-4 py-2 text-sm">
              ← ঠিক করো
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? "জমা হচ্ছে…" : "কিনুন — পেমেন্টের তথ্য জমা দিন"}
            </button>
          </div>
        </section>
      )}

      {/* ধাপ ৬: নিশ্চিতকরণ (জমা সফল; পেমেন্ট যাচাই বাকি) */}
      {step === 5 && done && (
        <section className="mt-5 rounded-2xl border border-line bg-surface shadow-sm p-6">
          <div className="rounded-lg border border-brand-line bg-brand-soft px-4 py-3 text-sm text-brand-strong" role="status">
            আপনার পেমেন্টের তথ্য সফলভাবে জমা হয়েছে। আমাদের অ্যাডমিন আপনার তথ্য যাচাই করবেন। পেমেন্ট
            অনুমোদিত হলে আপনার কেনা কনটেন্ট অ্যাকাউন্টে যুক্ত হবে। যাচাই সম্পন্ন হওয়ার আগে কনটেন্ট আনলক হবে না।
          </div>
          <dl className="mt-4 grid gap-2 text-sm">
            {[
              ["রিকোয়েস্ট নম্বর", done.id],
              ["কনটেন্ট", `${contentTypeLabelBn(done.contentType)} — ${done.itemTitle}`],
              ["অ্যামাউন্ট", `৳ ${bnNum(done.amount)}`],
              ["প্রোভাইডার", provider.nameBn],
              ["জমার সময়", fmtDateTime(done.createdAt)],
              ["বর্তমান স্ট্যাটাস", "যাচাইয়ের অপেক্ষায়"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 rounded-lg border border-line bg-surface-2/60 p-2.5">
                <dt className="text-faint">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {doneWarning && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {doneWarning}
            </p>
          )}
          <p className="mt-3 text-sm">
            <Link to="/profile" className="text-brand hover:underline">
              আমার পেমেন্ট ঐতিহাস প্রোফাইলে দেখো →
            </Link>
          </p>
        </section>
      )}

      {step < 5 && providers.every((p) => !p.verified) && step >= 1 && (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          ⓘ সততার নোট: কোনো প্রোভাইডারের রিসিভিং মেথড যাচাই না হওয়ায় এখন বাস্তব লেনদেন শুরু করা ঠিক হবে না।
          অ্যাডমিন প্যানেলে (সার্ভার-সাইড অথরাইজেশনসহ প্রোডাকশন ব্যাকএন্ড) যাচাই করা হলে এই ফ্লোটে জমা চালু হবে।
        </p>
      )}
    </article>
  );
}

/** নির্দেশনা-ধাপের কপি বাটন (কার্ড কম্পোনেন্টের কপি লজিক পুনরায় ব্যবহার) */
function PaymentMethodCardCopyHelper({ number }: { number: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(number);
        } catch {
          /* quote fallback: select text instead — card page uses same helper */
        }
      }}
      className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-surface-2"
      title={`কপি: ${number}`}
    >
      📋 কপি করো
    </button>
  );
}

/* কোর্স রাউট প্যারাম অনুযায়ী এন্ট্রি */
export function CheckoutPage() {
  const params = useParams();
  const type = params.type as ContentType | undefined;
  const slug = params.slug;

  if (type !== "article" && type !== "book" && type !== "course") return <Navigate to="/" replace />;
  if (!slug) return <Navigate to="/" replace />;

  return <CheckoutFlow type={type} slug={slug} />;
}
