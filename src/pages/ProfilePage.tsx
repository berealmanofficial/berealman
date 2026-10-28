import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Button, ButtonLink, Card, Input } from "../components/ui";
import { articles } from "../data/sample";
import type { Article } from "../data/types";
import { logoutAccount, updateAccountName, useSession } from "../lib/auth";
import { removeFavorite, useFavorites } from "../lib/favorites";
import {
  contentTypeLabelBn,
  fmtDateTime,
  loadPaymentRequests,
  loadProviders,
  purchasesForEmail,
  type PaymentRequest,
  type Purchase,
} from "../lib/payments";
import {
  APPLICATION_STATUS_LABEL,
  ARTICLE_STATUS_LABEL,
  WRITERS_LIMITATION_BN,
  applicationForEmail,
  articlesForEmail,
  useWriters,
} from "../lib/writers";

/* ───────────── লেখক ড্যাশবোর্ড — অনুমোদিত লেখকদের জন্য (বিদ্যমান প্রোফাইলের ভিতরে) ───────────── */

function WriterStatusBadge({ label, status }: { label: string; status: string }) {
  const tone =
    status === "approved" || status === "published"
      ? "border-brand-line bg-brand-soft text-brand"
      : status === "rejected"
        ? "border-danger/30 bg-danger-soft text-danger"
        : "border-amber-200 bg-amber-50 text-amber-900";
  return <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>;
}

function WriterArticleGroup({
  title,
  items,
  emptyHint,
}: {
  title: string;
  items: ReturnType<typeof articlesForEmail>;
  emptyHint: string;
}) {
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold">
        {title} — {items.length}
      </p>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-faint">{emptyHint}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface-2/60 px-3 py-2 text-sm">
              <WriterStatusBadge label={ARTICLE_STATUS_LABEL[a.status]} status={a.status} />
              <span className="min-w-0 flex-1 truncate">{a.title || "শিরোনামহীন"}</span>
              {a.status === "published" && a.slug && (
                <Link to={`/articles/${a.slug}`} className="text-xs font-medium text-brand hover:underline">
                  পড়ো →
                </Link>
              )}
              {(a.status === "draft" || a.status === "changes-requested" || a.status === "rejected") && (
                <Link to={`/writers/articles/${a.id}`} className="text-xs font-medium text-brand hover:underline">
                  সম্পাদনা →
                </Link>
              )}
              {(a.status === "changes-requested" || a.status === "rejected") && a.reviewNote && (
                <span className="w-full text-xs text-danger sm:w-auto">অ্যাডমিন: {a.reviewNote}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WriterDashboard({ profileEmail }: { profileEmail: string | null }) {
  useWriters(); // স্টোর আপডেট (খসড়া/স্ট্যাটাস বদল) বাস্তবসময়ে দেখাতে
  const app = applicationForEmail(profileEmail ?? "");

  if (!profileEmail || !app) {
    return (
      <Card className="p-5">
        <SectionTitle>লেখক ড্যাশবোর্ড</SectionTitle>
        <p className="mt-1 text-sm text-muted">
          সাইটের লেখক হতে চাইলে আবেদন করো — অনুমোদনের পর এখানে লেখালেখির ড্যাশবোর্ড সক্রিয় হবে।
        </p>
        <div className="mt-4">
          <ButtonLink to="/writers/apply">লেখক হোন — আবেদন করো</ButtonLink>
        </div>
        <div className="mt-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">ⓘ {WRITERS_LIMITATION_BN}</div>
        </div>
      </Card>
    );
  }

  if (app.status === "rejected") {
    return (
      <Card className="p-5">
        <SectionTitle>লেখক ড্যাশবোর্ড</SectionTitle>
        <div className="mt-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          আবেদন প্রত্যাখ্যাত হয়েছে{app.reviewNote ? ` — কারণ: ${app.reviewNote}` : ""}। তথ্য ঠিক করে আবার আবেদন জমা দিতে পারো।
        </div>
        <div className="mt-4">
          <ButtonLink to="/writers/apply">আবেদন সম্পাদনা এবং আবার জমা দাও</ButtonLink>
        </div>
        <p className="mt-3 text-xs text-faint">
          ইমেইল নোটিফিকেশন কনফিগার হয়নি — তাই সিদ্ধান্ত এখন এখানে দেখানো হয় (ইমেইলে নয়)।
        </p>
      </Card>
    );
  }

  if (app.status === "submitted" || app.status === "under-review") {
    return (
      <Card className="p-5">
        <SectionTitle>লেখক ড্যাশবোর্ড</SectionTitle>
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <WriterStatusBadge label={APPLICATION_STATUS_LABEL[app.status]} status={app.status} />
          <span className="text-sm">আবেদন সিদ্ধান্তের অপেক্ষায় — এই সময়ে আবেদন ও নমুনা সম্পাদনা করা যায়।</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink to="/writers/sample">লেখার নমুনা / সম্পূর্ণ করো</ButtonLink>
          <ButtonLink to="/writers/apply" variant="secondary">
            আবেদন সম্পাদনা
          </ButtonLink>
        </div>
        <div className="mt-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">ⓘ {WRITERS_LIMITATION_BN}</div>
        </div>
      </Card>
    );
  }

  // অনুমোদিত লেখক — ড্যাশবোর্ড
  const mine = articlesForEmail(profileEmail);
  const drafts = mine.filter((a) => a.status === "draft");
  const pending = mine.filter((a) => a.status === "pending");
  const published = mine.filter((a) => a.status === "published");
  const needsChanges = mine.filter((a) => a.status === "changes-requested" || a.status === "rejected");

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle>আমার লেখক ড্যাশবোর্ড</SectionTitle>
        <WriterStatusBadge label={APPLICATION_STATUS_LABEL.approved} status="approved" />
      </div>
      <p className="mt-1 text-sm text-muted">
        লেখক নাম: <strong>{app.displayName}</strong> — প্রকাশিত লেখায় এটিই ব্যবহৃত হবে।
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink to="/writers/articles/new">নতুন আর্টিকেল লিখুন</ButtonLink>
        <ButtonLink to="/writers/articles" variant="secondary">
          আমার আর্টিকেল — সব
        </ButtonLink>
      </div>

      <WriterArticleGroup title="খসড়া" items={drafts} emptyHint="এখনো কোনো খসড়া নেই।" />
      <WriterArticleGroup title="রিভিউয়ের অপেক্ষায়" items={pending} emptyHint="এখন কিছু রিভিউয়ের অপেক্ষায় নেই।" />
      <WriterArticleGroup title="প্রকাশিত" items={published} emptyHint="অ্যাডমিন অনুমোদনের পর প্রকাশিত লেখা এখানে দেখা যাবে।" />
      <WriterArticleGroup title="পরিবর্তন প্রয়োজন / প্রত্যাখ্যাত" items={needsChanges} emptyHint="কোনো লেখায় পরিবর্তন চাওয়া হয়নি।" />

      <div className="mt-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">ⓘ {WRITERS_LIMITATION_BN}</div>
      </div>
    </Card>
  );
}

/**
 * ⚠️ প্রোফাইল স্থিতি (সততা):
 *  - পরিচয় (নাম/ইমেইল) এখন অ্যাকাউন্ট থেকে আসে (src/lib/auth.ts) — সেশন ছাড়া এই পেজে ঢোকা যায় না,
 *    লগইন পেজে রিডাইরেক্ট হয় এবং লগইনের পর ঠিক এই সেকশনে ফিরে আসে।
 *  - বায়ো/অ্যাভাটার এই ডিভাইসের localStorage-এ সেভ হয় (বিদ্যমান আচরণ)।
 *  - তবুও এটি সার্ভার-সাইড auth নয় — অন্য ডিভাইসে সেশন/পছন্দ পাওয়া যায় না।
 *  - Reading History ও Purchased শুধুই বাস্তব ডেটায় চলে; খালি অবস্থায় "শীঘ্রণ" নোট থাকে, নকল তথ্য নয়।
 */

const PROFILE_KEY = "brm-profile-v1";

type Profile = {
  name: string;
  email: string;
  bio: string;
  avatar: string; // data URL
};

const emptyProfile: Profile = {
  name: "",
  email: "",
  bio: "",
  avatar: "",
};

type SectionKey =
  | "overview"
  | "personal"
  | "writer"
  | "payments"
  | "history"
  | "saved"
  | "purchased"
  | "security"
  | "notifications";

const sections: { key: SectionKey; label: string }[] = [
  { key: "overview", label: "ওভারভিউ" },
  { key: "personal", label: "ব্যক্তিগত তথ্য" },
  { key: "writer", label: "লেখক ড্যাশবোর্ড" },
  { key: "payments", label: "আমার পেমেন্ট" },
  { key: "purchased", label: "কেনা কনটেন্ট" },
  { key: "history", label: "পাঠ ইতিহাস" },
  { key: "saved", label: "সেভ করা আর্টিকেল" },
  { key: "security", label: "অ্যাকাউন্ট ও নিরাপত্তা" },
  { key: "notifications", label: "নোটিফিকেশন (শীঘ্রণ)" },
];

function isSectionKey(value: string | null): value is SectionKey {
  return value !== null && sections.some((s) => s.key === value);
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="font-bnserif text-lg font-bold sm:text-xl">{children}</h2>;
}

function ComingNote({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      ⓘ {children}
    </div>
  );
}

/* ───────────── সেভ করা আর্টিকেল (❤️ পছন্দ) — শুধু এই অ্যাকাউন্টের ───────────── */

function SavedArticles({ email }: { email: string }) {
  const slugs = useFavorites(email);
  const items = slugs
    .map((s) => articles.find((a) => a.slug === s))
    .filter((a): a is Article => Boolean(a));

  return (
    <Card className="p-5">
      <SectionTitle>সেভ করা আর্টিকেল</SectionTitle>
      <p className="mt-1 text-sm text-muted">
        তুমি ❤️ করা আর্টিকেলগুলো — এই অ্যাকাউন্টের জন্য এই ব্রাউজারে সেভ থাকে (auth ব্যাকএন্ড যুক্ত হলে
        ক্লাউডে সিঙ্ক হবে)।
      </p>
      {items.length === 0 ? (
        <div className="mt-4">
          <ComingNote>
            এই অ্যাকাউন্টে এখনো কোনো পছন্দের আর্টিকেল নেই — যেকোনো আর্টিকেল খুলে ❤️ চাপলে সেটি এখানে
            যুক্ত হবে।
          </ComingNote>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((a) => (
            <li
              key={a.slug}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
            >
              <img
                src={a.cover}
                alt=""
                className="h-14 w-20 shrink-0 rounded-lg object-cover"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <Link
                  to={`/articles/${a.slug}`}
                  className="font-bnserif block truncate font-bold hover:text-brand"
                >
                  {a.title}
                </Link>
                <p className="mt-0.5 text-xs text-faint">
                  {a.readingTimeMin} মিনিট পড়া · ❤️ পছন্দে আছে
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => removeFavorite(email, a.slug)}>
                সরাও
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm">
        <Link to="/articles" className="text-brand hover:underline">
          আরও আর্টিকেল দেখে পছন্দ যোগ করো →
        </Link>
      </p>
    </Card>
  );
}

/* ───────────── আমার পেমেন্ট — শুধু এই অ্যাকাউন্টের রিকোয়েস্ট ───────────── */

const STATUS_LABEL: Record<PaymentRequest["status"], string> = {
  pending: "যাচাইয়ের অপেক্ষায়",
  approved: "অনুমোদিত",
  rejected: "প্রত্যাখ্যাত",
};

function statusClasses(s: PaymentRequest["status"]) {
  if (s === "approved") return "border-brand-line bg-brand-soft text-brand";
  if (s === "rejected") return "border-danger/30 bg-danger-soft text-danger";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

/** অ্যাকাউন্ট ইমেইল ধরে নিজের রিকোয়েস্ট ফিল্টার (auth ব্যাকএন্ড Phase 2) */
function PaymentHistory({ profileEmail }: { profileEmail: string | null }) {
  const all = loadPaymentRequests();
  const mine = all.filter((r) => r.accountEmail === (profileEmail ?? null));
  const providerName = (id: string) => loadProviders().find((p) => p.id === id)?.nameBn ?? id;

  return (
    <Card className="p-5">
      <SectionTitle>আমার পেমেন্ট</SectionTitle>
      <p className="mt-1 text-sm text-muted">
        তোমার জমা দেওয়া পেমেন্ট রিকোয়েস্ট ও তাদের যাচাই-স্ট্যাটাস — শুধু নিজের রিকোয়েস্টই এখানে দেখা যাবে।
      </p>
      {!profileEmail ? (
        <div className="mt-4">
          <ComingNote>
            এই অ্যাকাউন্টে ইমেইল যুক্ত থাকে — পেমেন্ট রিকোয়েস্ট ওই ইমেইলের সাথেই মেলানো হয়।
          </ComingNote>
        </div>
      ) : mine.length === 0 ? (
        <div className="mt-4">
          <ComingNote>এই অ্যাকাউন্টে এখনো কোনো পেমেন্ট রিকোয়েস্ট জমা হয়নি।</ComingNote>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {mine.map((r) => (
            <div key={r.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bnserif text-base font-bold">#{r.id}</span>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClasses(r.status)}`}>
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
              <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                <div>
                  কনটেন্ট: <strong>{contentTypeLabelBn(r.contentType)} — {r.itemTitle}</strong>
                </div>
                <div>
                  অ্যামাউন্ট: <strong className="text-brand">৳{r.amount.toLocaleString("bn-BD")}</strong>
                </div>
                <div>
                  প্রোভাইডার: <strong>{providerName(r.providerId)}</strong>
                </div>
                <div>জমার সময়: {fmtDateTime(r.createdAt)}</div>
                <div>
                  সেন্ডার নম্বর: <strong>{r.senderMobile}</strong>
                </div>
                <div>
                  ট্রানজেকশন আইডি (TrxID): <strong>{r.txnId}</strong>
                </div>
              </dl>
              {r.status === "rejected" && r.rejectReason && (
                <div className="mt-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
                  প্রত্যাখ্যানের কারণ: {r.rejectReason}
                  <p className="mt-1 text-xs text-muted">
                    ঠিক করা তথ্য দিয়ে নতুন রিকোয়েস্ট জমা দেওয়া যাবে (আগের এই রেকর্ডটিও ইতিহাসে থাকবে) —{" "}
                    <Link
                      to={`/checkout/${r.contentType}/${r.itemSlug}`}
                      className="font-medium text-brand hover:underline"
                    >
                      নতুন পেমেন্ট জমা দাও →
                    </Link>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ───────────── কেনা কনটেন্ট — শুধু অনুমোদিত কেনা ───────────── */

function PurchasedItems({ profileEmail }: { profileEmail: string | null }) {
  const purchases: Purchase[] = profileEmail ? purchasesForEmail(profileEmail) : [];
  const boughtLinks: Record<Purchase["contentType"], (slug: string) => [string, string]> = {
    article: (s) => [`/preview/${s}`, "পড়ো →"],
    book: (s) => [`/books/${s}`, "দেখো →"],
    course: (s) => [`/courses/${s}`, "কোর্সে ঢোকো →"],
  };

  return (
    <Card className="p-5">
      <SectionTitle>কেনা কনটেন্ট</SectionTitle>
      <p className="mt-1 text-sm text-muted">
        শুধুমাত্র বাস্তব তথ্য: অ্যাডমিন-অনুমোদিত কেনাগুলোই এখানে দেখা যাবে — পেমেন্ট জমা বা নমুনা
        ডেটা কিছুই এখানে ফেলা হয় না।
      </p>
      {purchases.length === 0 ? (
        <div className="mt-4">
          <ComingNote>এখনো কোনো অনুমোদিত কেনা নেই — পেমেন্ট অনুমোদিত হলে এখানে যুক্ত হবে।</ComingNote>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {purchases.map((p) => {
            const [to, action] = boughtLinks[p.contentType](p.slug);
            return (
              <div
                key={`${p.contentType}-${p.slug}-${p.requestId}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-line bg-brand-soft px-4 py-3"
              >
                <div className="text-sm">
                  <p className="font-semibold text-brand">
                    ✓ {contentTypeLabelBn(p.contentType)} — {p.slug}
                  </p>
                  <p className="text-xs text-muted">
                    লাইফটাইম অ্যাক্সেস · অনুমোদিত: {fmtDateTime(p.grantedAt)}
                  </p>
                </div>
                <Link to={to} className="text-sm font-medium text-brand hover:underline">
                  {action}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function AvatarBlock({
  profile,
  onChange,
}: {
  profile: Profile;
  onChange: (p: Profile) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    setMsg(null);
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setMsg("শুধু JPEG, PNG বা WebP ইমেজ দেবে।");
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      setMsg("ছবির সর্বোচ্চ সাইজ ২ MB — ছোট করে আবার চেষ্টা করো।");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange({ ...profile, avatar: reader.result });
      }
    };
    reader.readAsDataURL(f);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt="প্রোফাইল ছবি"
            className="h-20 w-20 rounded-full border border-line object-cover"
          />
        ) : (
          <span className="grid h-20 w-20 place-items-center rounded-full border border-dashed border-line bg-surface-2 font-bnserif text-xl font-bold text-faint">
            {profile.name ? profile.name.trim().charAt(0) || "–" : "–"}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
            ছবি আপলোড / পরিবর্তন
          </Button>
          {profile.avatar && (
            <Button size="sm" variant="ghost" onClick={() => onChange({ ...profile, avatar: "" })}>
              ফাইল সরাও
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            disabled
            title="AI অ্যাভাটার জেনারেশন ব্যাকএন্ড জুড়ার পর সক্রিয় হবে"
            className="opacity-60"
          >
            ✦ AI অ্যাভাটার (শীঘ্রণ)
          </Button>
        </div>
        <p className="text-xs text-faint">অভিবাবক নোট: JPEG/PNG/WebP · সর্বোচ্চ ২ MB · ডিভাইসে সেভ হয়</p>
        {msg && <p className="text-xs text-danger">{msg}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={pick}
        />
      </div>
    </div>
  );
}

export function ProfilePage() {
  const session = useSession();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [editOpen, setEditOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) setProfile({ ...emptyProfile, ...(JSON.parse(raw) as Profile) });
    } catch {
      /* দুর্বল ডেটা — পুরো খালি নেবো */
    }
  }, []);

  const rawSection = params.get("section");
  const active: SectionKey = isSectionKey(rawSection) ? rawSection : "overview";

  // ভুল সেকশন প্যারামিটার হলে URL পরিষ্কার করা হয়
  useEffect(() => {
    if (rawSection && !isSectionKey(rawSection)) setParams({}, { replace: true });
  }, [rawSection, setParams]);

  /** লগইন ছাড়া এই পেজে ঢোকা যায় না — লগইনের পর ঠিক এই সেকশনে ফেরানো হয় */
  if (!session) {
    const query = params.toString();
    const next = query ? `/profile?${query}` : "/profile";
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  const accountEmail = session.email;
  const displayName = session.name || profile.name;

  const goTo = (key: SectionKey) => {
    setEditOpen(false);
    setParams(key === "overview" ? {} : { section: key });
  };

  const save = (next: Profile) => {
    const merged: Profile = { ...next, email: accountEmail };
    setProfile(merged);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
    const trimmed = merged.name.trim();
    if (trimmed && trimmed !== session.name) updateAccountName(accountEmail, trimmed);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1600);
  };

  const logout = () => {
    logoutAccount();
    localStorage.removeItem(PROFILE_KEY);
    navigate("/", { replace: true });
  };

  const tabBase =
    "inline-flex items-center rounded-full border bg-surface px-3.5 py-2 text-sm font-medium transition-colors";
  const tabCls = (k: SectionKey) =>
    `${tabBase} ${active === k ? "border-2 border-brand bg-brand-soft font-semibold text-brand" : "border border-line text-ink"}`;

  return (
    <div className="mx-auto max-w-5xl">
      {/* প্রোফাইল হেডার */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <AvatarBlock profile={{ ...profile, name: displayName }} onChange={save} />
          <div className="min-w-0 flex-1">
            <h1 className="font-bnserif text-xl font-bold sm:text-2xl">
              {displayName || "নাম নির্ধারিত হয়নি"}
            </h1>
            <p className="mt-0.5 truncate text-sm text-muted">{accountEmail}</p>
            <p className="mt-1.5 line-clamp-2 text-sm text-muted">
              {profile.bio || "নিজের সাফল্যপথ কয়েক লাইনে লিখে রাখো — এটা তোমার দৃশ্যমান জীবনী হবে।"}
            </p>
          </div>
          <Button variant="secondary" onClick={() => setEditOpen((v) => !v)}>
            {editOpen ? "সম্পাদনা বন্ধ" : "প্রোফাইল সম্পাদনা"}
          </Button>
        </div>
        {savedFlash && (
          <p className="mt-3 rounded-lg bg-brand-soft px-3 py-2 text-sm font-medium text-brand" role="status">
            ✓ সাভ হয়েছে (এই ডিভাইসে)
          </p>
        )}
      </Card>

      {/* মোবাইল ট্যাব রো */}
      <nav className="mt-4 flex gap-2 overflow-x-auto no-scrollbar lg:hidden" aria-label="প্রোফাইল সেকশন">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => goTo(s.key)}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-sm transition-colors ${
              active === s.key
                ? "border-brand-line bg-brand-soft font-semibold text-brand"
                : "border-line bg-surface text-ink"
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="mt-4 grid gap-6 lg:grid-cols-[220px_1fr] lg:mt-6">
        {/* সাইডবার (ডেস্কটপ) */}
        <aside className="hidden lg:block">
          <Card className="p-2">
            <nav className="space-y-0.5">
              {sections.map((s) => (
                <button key={s.key} onClick={() => goTo(s.key)} className={tabCls(s.key)}>
                  {s.label}
                </button>
              ))}
              <button onClick={logout} className={`${tabBase} mt-2 text-danger hover:bg-danger-soft`}>
                লগআউট
              </button>
            </nav>
          </Card>
        </aside>

        {/* কনটেন্ট প্যানেল */}
        <div className="space-y-4">
          {/* ওভারভিউ + সম্পাদনা */}
          {(active === "overview" || active === "personal") && (
            <Card className="p-5">
              <SectionTitle>ব্যক্তিগত তথ্য</SectionTitle>
              <p className="mt-1 text-sm text-muted">
                নাম ও ইমেইল তোমার অ্যাকাউন্টের সাথে যুক্ত; সংক্ষিপ্ত পরিচয় এই ব্রাউজারে সেভ হয়।
                auth ব্যাকএন্ড চালু হলে অ্যাকাউন্ট ডেটা ক্লাউডে সিঙ্ক হবে (Phase 2)।
              </p>
              {editOpen || active === "personal" ? (
                <form
                  className="mt-4 grid gap-4 sm:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    save(profile);
                    setEditOpen(false);
                  }}
                >
                  <div>
                    <label htmlFor="pf-name" className="mb-1 block text-sm font-medium">
                      পুরো নাম
                    </label>
                    <Input
                      id="pf-name"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      placeholder="তোমার পুরো নাম"
                    />
                  </div>
                  <div>
                    <label htmlFor="pf-email" className="mb-1 block text-sm font-medium">
                      ইমেইল
                    </label>
                    <Input id="pf-email" type="email" value={accountEmail} readOnly className="opacity-70" />
                    <p className="mt-1 text-xs text-faint">অ্যাকাউন্ট ইমেইল — এখান থেকে বদলানো যায় না।</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="pf-bio" className="mb-1 block text-sm font-medium">
                      সংক্ষিপ্ত পরিচয়
                    </label>
                    <textarea
                      id="pf-bio"
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      rows={3}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint"
                      placeholder="কয়েক লাইনে নিজেকে পরিচয় করাও…"
                    />
                  </div>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button type="submit">সেভ করো</Button>
                    <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                      বাতিল
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border border-line bg-surface-2/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-faint">নাম</p>
                    <p className="mt-1 font-medium">{displayName || "—"}</p>
                  </div>
                  <div className="rounded-lg border border-line bg-surface-2/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-faint">ইমেইল</p>
                    <p className="mt-1 font-medium">{accountEmail}</p>
                  </div>
                  <div className="rounded-lg border border-line bg-surface-2/60 p-3 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-faint">পরিচয়</p>
                    <p className="mt-1">{profile.bio || "—"}</p>
                  </div>
                  <div className="rounded-lg border border-line bg-surface-2/60 p-3 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-faint">
                      পছন্দের তালিকা
                    </p>
                    <p className="mt-1">
                      ❤️ করা আর্টিকেলগুলো{" "}
                      <button
                        onClick={() => goTo("saved")}
                        className="font-medium text-brand hover:underline"
                      >
                        সেভ করা আর্টিকেল
                      </button>{" "}
                      সেকশনে দেখো।
                    </p>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* লেখক ড্যাশবোর্ড — অনুমোদিত লেখকদের জন্য সাধারণ প্রোফাইলের ভিতরেই */}
          {active === "writer" && <WriterDashboard profileEmail={accountEmail} />}

          {/* সেভ করা আর্টিকেল — এই অ্যাকাউন্টের ❤️ তালিকা */}
          {active === "saved" && <SavedArticles email={accountEmail} />}

          {/* আমার পেমেন্ট — শুধু নিজের রিকোয়েস্ট */}
          {active === "payments" && <PaymentHistory profileEmail={accountEmail} />}

          {active === "history" && (
            <Card className="p-5">
              <SectionTitle>পাঠ ইতিহাস</SectionTitle>
              <p className="mt-1 text-sm text-muted">
                তুমি সদ্য পড়া আর্টিকেলগুলো এখানে দেখতে পারবে — সার্ভার-সাইড ইতিহাস যুক্ত হওয়ার পর (Phase 2)।
              </p>
              <div className="mt-4">
                <ComingNote>
                  auth ব্যাকএন্ড চালু হওয়া পর্যন্ত পাঠ ইতিহাস সংগ্রহ করা হয় না — কোনো নকল তালিকা দেখানো হবে না।
                </ComingNote>
              </div>
            </Card>
          )}

          {active === "purchased" && <PurchasedItems profileEmail={accountEmail} />}

          {active === "security" && (
            <Card className="p-5">
              <SectionTitle>অ্যাকাউন্ট ও নিরাপত্তা</SectionTitle>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-lg border border-line bg-surface-2/60 p-3">
                  <p className="font-medium">সেশন ও পাসওয়ার্ড</p>
                  <p className="mt-1 text-muted">
                    অ্যাকাউন্ট ও সেশন এই ব্রাউজারে (localStorage) রাখা হয়; পাসওয়ার্ড সল্টেড SHA-256
                    হ্যাশ হিসেবে সেভ হয়। সার্ভার-সাইড সেশন, পাসওয়ার্ড রিসেট, ইমেইল ভেরিফিকেশন ও Google
                    অ্যাকাউন্ট লিঙ্ক auth ব্যাকএন্ড যুক্ত হলে আসবে (Phase 2)।
                  </p>
                </div>
                <div className="rounded-lg border border-line bg-surface-2/60 p-3">
                  <p className="font-medium">ডেটা মুছে ফেলা</p>
                  <p className="mt-1 text-muted">
                    নিচের লগআউট বাটন এই ডিভাইসের সেশন ও সেভ করা প্রোফাইল ডেটা সরিয়ে দেয়; পছন্দের
                    তালিকা অ্যাকাউন্টের সাথে যুক্ত থাকে, তাই আবার লগইন করলে ফিরে আসে।
                  </p>
                </div>
              </div>
            </Card>
          )}

          {active === "notifications" && (
            <Card className="p-5">
              <SectionTitle>নোটিফিকেশন</SectionTitle>
              <p className="mt-1 text-sm text-muted">
                ইমেইল সার্ভিস যুক্ত হলে প্রিরেফারেন্সগুলোতে প্রয়োগ হবে — ততদিন এই সেটিং শুধুই ইউআই।
              </p>
              <div className="mt-4">
                <ComingNote>নোটিফিকেশন সিস্টেম (ইমেইল/পুশ) এখনো যুক্ত হয়নি।</ComingNote>
              </div>
            </Card>
          )}

          <div className="rounded-xl border border-dashed border-line bg-surface px-5 py-4 text-center lg:hidden">
            <button onClick={logout} className="text-sm font-semibold text-danger">
              লগআউট
            </button>
          </div>
        </div>
      </div>

      {/* সৎ নোট */}
      <p className="mt-6 text-center text-xs text-faint">
        লগইন করা আছে: <strong>{accountEmail}</strong> — এই অ্যাকাউন্ট এই ব্রাউজারে সেভ (localStorage),
        সার্ভার-সাইড authentication এখনো যুক্ত হয়নি। বিস্তারিত{" "}
        <Link to="/login" className="text-brand hover:underline">
          লগইন পেজে
        </Link>
        ।
      </p>
    </div>
  );
}
