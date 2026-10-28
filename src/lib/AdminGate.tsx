import { useMemo, useState } from "react";
import { ADMIN_PASSCODE, useAdminAccess } from "./adminGate";

/**
 * অ্যাডমিন গেট UI (shared) — কোর্স ও পেমেন্ট ম্যানেজমেন্ট পেজে ব্যবহৃত।
 * ক্লায়েন্ট-সাইড ডেমো প্রোটেকশন; সত্যিকারের নিরাপত্তা Phase 2 (auth ব্যাকএন্ড)।
 */
export function AdminGate({ title }: { title: string }) {
  const { unlocked, unlock, lock } = useAdminAccess();
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (unlocked) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={lock}
            className="text-xs font-medium text-muted hover:text-ink"
            title="অ্যাডমিন সেশন লক করো"
          >
            ⌨️ অ্যাডমিন সেশন লক করো
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface shadow-sm p-6">
      <div className="flex flex-col items-center text-center">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#3f0d12] font-bnserif text-sm font-black text-white">
          BR
        </span>
        <h1 className="font-bnserif mt-3 text-xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted">অ্যাডমিন পাসওয়ার্ড দিয়ে ঢুকুন।</p>
      </div>
      <form
        className="mt-5 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setErr(unlock(pass) ? null : "ভুল পাসওয়ার্ড।");
        }}
      >
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="অ্যাডমিন পাসওয়ার্ড"
          aria-label="অ্যাডমিন পাসওয়ার্ড"
          className="h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-faint focus:border-brand"
        />
        {err && (
          <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
            {err}
          </p>
        )}
        <button
          type="submit"
          className="h-11 w-full rounded-lg bg-red-600 text-sm font-bold text-white transition-colors hover:bg-red-700"
        >
          ঢুকে পড়ুন
        </button>
      </form>
      <p className="mt-3 rounded-lg border border-line bg-amber-50 px-3 py-2 text-xs text-amber-900">
        ⓘ ক্লায়েন্ট-সাইড ডেমো গেট — সত্যিকারের অ্যাডমিন নিরাপত্তা auth ব্যাকএন্ডে (Phase 2) আসবে।
        ডিফল্ট ডেমো পাসওয়ার্ড: <code>{ADMIN_PASSCODE}</code> — <code>VITE_ADMIN_PASSCODE</code> env দিয়ে বদলান।
      </p>
    </div>
  );
}

/** রিফ্রেশ হেল্পার: পেজ স্টেট স্টোর থেকে নতুন করে পড়া */
export function useUnlockedOrNull() {
  const { unlocked } = useAdminAccess();
  return useMemo(() => unlocked, [unlocked]);
}
