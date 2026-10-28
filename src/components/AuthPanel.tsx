import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { loginAccount, registerAccount, type Session } from "../lib/auth";

/**
 * লগইন / নতুন অ্যাকাউন্ট প্যানেল — বিদ্যমান ডিজাইন অপরিবর্তিত।
 * দুই জায়গায় পুনর্ব্যবহৃত: /login পেজ (variant="page") ও ♡ ক্লিকে খোলা মোডাল (variant="modal")।
 *
 * ⚠️ সততা: ফর্ম সাবমিট আসলেই অ্যাকাউন্ট তৈরি/লগইন করে (ডিভাইস-লোকাল স্টোর),
 * কিন্তু এটি সার্ভার-সাইড authentication নয়। Google সাইন-ইন কনফিগার না থাকায়
 * ক্লিক করলে স্পষ্ট জানানো হয় — কোনো ভুয়া "সফল" অবস্থা দেখানো হয় না।
 */

type Mode = "login" | "register";

/* ব্র্যান্ড-অনুপ্রাণিত আসল ইলাস্ট্রেশন — Wafilife-এর কোনো আর্ট/লোগো কপি নয় */
function AuthIllustration() {
  return (
    <div className="relative h-64 w-full overflow-hidden rounded-xl bg-[#fafaf7] sm:h-full sm:min-h-[520px]">
      {/* লাল সূর্য */}
      <div className="absolute left-1/2 top-16 h-40 w-40 -translate-x-1/2 rounded-full bg-red-600/90 sm:h-52 sm:w-52" aria-hidden="true" />
      {/* সিলুয়েট পুরুষ — বই হাতে, মেরুন পোশাক */}
      <svg viewBox="0 0 200 320" className="absolute bottom-0 left-1/2 h-[78%] -translate-x-1/2" aria-hidden="true" fill="#3f0d12">
        {/* মাথা */}
        <circle cx="100" cy="46" r="22" />
        {/* ধীরা/শাল */}
        <path d="M84 66 C 70 110, 68 170, 74 220 L 126 220 C 132 170, 130 110, 116 66 Z" />
        {/* বাক্স/বইগুচ্ছ */}
        <rect x="40" y="150" width="52" height="40" rx="4" fill="#7f1d1d" />
        <rect x="42" y="140" width="48" height="12" rx="3" fill="#991b1b" />
        {/* হাত — বক্স ধরা */}
        <path d="M78 108 C 64 130, 56 150, 64 168 L 84 168 C 82 148, 88 120, 96 104 Z" />
        {/* পাজামা-ট্রাউজার */}
        <path d="M76 220 L 92 220 L 90 300 L 78 300 Z" />
        <path d="M108 220 L 124 220 L 122 300 L 110 300 Z" />
        {/* জ্যাকেট পথ লাল ডোরা */}
        <path d="M100 66 L 100 220" stroke="#b91c1c" strokeWidth="4" fill="none" />
      </svg>
      {/* শহররেখা */}
      <svg viewBox="0 0 160 60" className="absolute bottom-0 left-0 h-14 w-full text-stone-300/70" fill="currentColor" preserveAspectRatio="none" aria-hidden="true">
        <rect x="4" y="18" width="18" height="42" />
        <rect x="28" y="30" width="14" height="30" />
        <rect x="118" y="14" width="20" height="46" />
        <rect x="144" y="28" width="14" height="32" />
      </svg>
      {/* ক্যাপশন */}
      <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink shadow-sm ring-1 ring-line">
        Be Real Man · হও আসল পুরুষ
      </div>
    </div>
  );
}

const inputCls =
  "h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-faint focus:border-brand";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.2h6.6c-.1 1.1-.8 2.7-2.4 3.8l.02.16 3.5 2.7.24.02c2.2-2 3.5-5 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1 7.9-2.8l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.2 0-5.9-2.1-6.9-5l-.15.01-3.6 2.8-.05.13C3.2 21.3 7.3 24 12 24Z" />
      <path fill="#FBBC05" d="M5.1 14.5c-.25-.75-.4-1.5-.4-2.5s.15-1.75.42-2.5l-.01-.17-3.63-2.8-.12.06A11.94 11.94 0 0 0 0 12c0 1.9.46 3.7 1.28 5.3l3.82-2.8Z" />
      <path fill="#EA4335" d="M12 4.8c2.2 0 3.7 1 4.6 1.7l3.3-3.2C17.9 1.4 15.2 0 12 0 7.3 0 3.2 2.7 1.3 6.7l3.8 2.8C6 6.6 8.8 4.8 12 4.8Z" />
    </svg>
  );
}

export function AuthPanel({
  variant = "page",
  onSuccess,
}: {
  variant?: "page" | "modal";
  onSuccess?: (session: Session) => void;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [ageOk, setAgeOk] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validate = (): string[] => {
    const errs: string[] = [];
    if (mode === "register") {
      if (name.trim().length < 3) errs.push("নাম কমপক্ষে ৩ অক্ষরের হতে হবে।");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
      errs.push("সঠিক ইমেইল ঠিকানা লিখো (যেমন: name@example.com)।");
    if (password.length < 8) errs.push("পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।");
    if (mode === "register" && !ageOk)
      errs.push("১৮+ শর্ত স্বীকার করতে হবে — প্ল্যাটফর্মটি শুধু প্রাপ্তবয়স্কদের জন্য।");
    return errs;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);
    const errs = validate();
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setBusy(true);
    try {
      const result =
        mode === "login"
          ? await loginAccount({ email, password })
          : await registerAccount({ name, email, password });
      if (!result.ok) {
        setErrors([result.error]);
        return;
      }
      setPassword("");
      onSuccess?.(result.session);
    } catch {
      setErrors(["লগইন প্রক্রিয়া সম্পন্ন করা যায়নি — আবার চেষ্টা করো।"]);
    } finally {
      setBusy(false);
    }
  };

  const withGoogle = () => {
    setErrors([]);
    setNotice(
      "Google সাইন-ইন এখনো কনফিগার নয়: এর জন্য Google Cloud Console-এ OAuth ক্লায়েন্ট তৈরি করে প্ল্যাটফর্মে যুক্ত করতে হবে (Phase 2)।",
    );
  };

  return (
    <div
      className={
        variant === "page"
          ? "grid overflow-hidden rounded-2xl border border-line bg-surface shadow-sm md:grid-cols-2"
          : "bg-surface"
      }
    >
      {/* বাম: ব্র্যান্ডেড ভিজ্যুয়াল (শুধু পেজ ভ্যারিয়েন্টে) */}
      {variant === "page" && (
        <div className="hidden p-6 md:block">
          <AuthIllustration />
        </div>
      )}

      {/* ডান: ফর্ম */}
      <div className={variant === "page" ? "p-6 sm:p-10" : "p-6 sm:p-7"}>
        <div className="flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#3f0d12] font-bnserif text-sm font-black text-white">
            BR
          </span>
          <p className="mt-3 text-sm font-semibold text-muted">ইমেইল দিয়ে সাইন-ইন করুন</p>
          <p className="text-xs text-faint">বাস্তব পুরুষরা প্রশ্ন করে শেখে — শুরু করে জয় করে</p>
        </div>

        {/* মোড ট্যাব */}
        <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1" role="tablist">
          {(
            [
              ["login", "লগইন"],
              ["register", "নতুন অ্যাকাউন্ট"],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setErrors([]);
                setNotice(null);
              }}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                mode === m ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          {mode === "register" && (
            <div>
              <label htmlFor="reg-name" className="mb-1 block text-sm font-medium">
                পুরো নাম
              </label>
              <input
                id="reg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="তোমার পুরো নাম"
                autoComplete="name"
              />
            </div>
          )}
          <div>
            <label htmlFor="auth-email" className="mb-1 block text-sm font-medium">
              ইমেইল
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="name@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="auth-password" className="mb-1 block text-sm font-medium">
              পাসওয়ার্ড
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              placeholder="কমপক্ষে ৮ অক্ষর"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
          {mode === "register" && (
            <label className="flex items-start gap-2.5 text-sm text-muted">
              <input
                type="checkbox"
                checked={ageOk}
                onChange={(e) => setAgeOk(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#047857]"
              />
              <span>
                আমার বয়স ১৮+ এবং{" "}
                <Link to="/terms" className="text-brand hover:underline">
                  ব্যবহারের শর্তাবলী
                </Link>{" "}
                যথাযথভাবে মেনে চলছি।
              </span>
            </label>
          )}

          {/* ভুল তালিকা */}
          {errors.length > 0 && (
            <div className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
              <ul className="list-inside list-disc space-y-1">
                {errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          {/* সৎ অবস্থা: Google/সার্ভার auth নেই */}
          {notice && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="h-11 w-full rounded-lg bg-red-600 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? "যাচাই করা হচ্ছে…" : mode === "login" ? "লগইন / রেজিস্ট্রেশন" : "অ্যাকাউন্ট তৈরি করুন"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-faint">
          <span className="h-px flex-1 bg-line" />
          অথবা
          <span className="h-px flex-1 bg-line" />
        </div>

        <button
          type="button"
          onClick={withGoogle}
          className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-surface text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          <GoogleIcon />
          Google দিয়ে চালিয়ে যান
        </button>

        <p className="mt-5 text-center text-xs text-muted">
          মোড বদলাতে উপরের ট্যাব ব্যবহার করো — লগইন ও নতুন অ্যাকাউন্ট একই পেজে। অ্যাকাউন্ট ও সেশন এই{" "}
          ব্রাউজারেই সেভ হয় (সার্ভার-সাইড auth এখনো যুক্ত হয়নি)। সব তথ্য{" "}
          <Link to="/privacy" className="text-brand hover:underline">
            প্রাইভেসি পলিসি
          </Link>{" "}
          অনুযায়ী নিশ্চিত থাকবে।
        </p>
      </div>
    </div>
  );
}
