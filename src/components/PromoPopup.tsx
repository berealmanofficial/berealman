import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

/**
 * প্রমো পপআপ কনফিগারেশন
 * ------------------------------------------------------------------
 * real campaign এলে শুধু এখানে বদলে দিও:
 *  - href:        ক্লিক করলে যে লিঙ্কে যাবে (internal route বাহ্যিক URL-ও হতে পারে)
 *  - external:    true হলে <a target="_blank">, false হলে internal <Link>
 *  - art:         ব্যানার আর্টওয়ার্ক (এখন টেম্পোরারি ক্যাম্পেইন আর্ট; পরে <img>-ও বসানো যাবে)
 * ------------------------------------------------------------------
 */
export const promoConfig = {
  href: "/articles",
  external: false as const,
  alt: "Be Real Man ক্যাম্পেইন",
};

/* টেম্পোরারি ক্যাম্পেইন আর্ট — ব্র্যান্ডের মেরুন-কালো-সাদা ভাষায় মালিকানাধীন কম্পোজিশন */
function PromoArtwork() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#fafaf7] text-center">
      {/* উপরের মেরুন ব্লক */}
      <div className="relative flex h-[38%] items-center justify-center overflow-hidden bg-[#3f0d12]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(90% 100% at 50% 0%, rgba(190,18,26,0.35), transparent 65%)",
          }}
          aria-hidden="true"
        />
        <p className="font-bnserif relative text-4xl font-black leading-none text-white sm:text-5xl">
          হও আসল পুরুষ
        </p>
        <svg
          className="absolute bottom-3 left-1/2 h-3 w-56 -translate-x-1/2 text-red-600"
          viewBox="0 0 200 12"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M2 8 C 60 1, 140 1, 198 6" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      {/* নিচের সাদা অংশ — অফার কপি */}
      <div className="px-5 pt-4">
        <p className="text-[13px] font-semibold text-ink/70">১৮+ মুসলিম পুরুষদের জন্য</p>
        <p className="font-bnserif mt-1 text-2xl font-black leading-snug text-ink sm:text-3xl">
          সপ্তাহে নতুন <span className="text-red-700">বাংলা দিকনির্দেশনা</span>
        </p>
        <p className="font-bnserif mt-0.5 text-2xl font-black leading-snug text-red-700 sm:text-3xl">
          ফ্রি পড়া শুরু করো!
        </p>
      </div>

      {/* নিচের ইলাস্ট্রেশন — আর্টিকেল/বই + শহররেখা */}
      <div className="absolute bottom-0 left-0 right-0 h-[34%]" aria-hidden="true">
        <svg viewBox="0 0 440 140" className="h-full w-full text-stone-300" fill="currentColor" preserveAspectRatio="xMidYMax meet">
          {/* শহররেখা */}
          <rect x="18" y="52" width="34" height="88" opacity="0.5" />
          <rect x="60" y="70" width="26" height="70" opacity="0.35" />
          <rect x="356" y="46" width="40" height="94" opacity="0.5" />
          <rect x="404" y="66" width="26" height="74" opacity="0.35" />
          <circle cx="70" cy="34" r="18" opacity="0.28" />
          <circle cx="380" cy="26" r="14" opacity="0.28" />
        </svg>
        {/* বইয়ের স্তূপ */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-end gap-0">
          <div className="h-10 w-16 rounded-sm bg-[#3f0d12] shadow" />
          <div className="-ml-2 h-12 w-18 rounded-sm bg-red-700 shadow" />
          <div className="-ml-2 h-9 w-14 rounded-sm bg-stone-700 shadow" />
        </div>
        {/* বৃত্তাকার ব্র্যান্ড সিল */}
        <div className="absolute bottom-3 right-6 grid h-14 w-14 place-items-center rounded-full bg-[#3f0d12] ring-2 ring-white shadow-md">
          <span className="font-bnserif text-[11px] font-black leading-tight text-white">
            Be
            <br />
            Real
            <br />
            Man
          </span>
        </div>
      </div>
    </div>
  );
}

export function PromoPopup({
  config,
  onClose,
}: {
  config: { href: string; external: boolean; alt: string };
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={promoConfig.alt}
      className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4"
      onClick={onClose}
    >
      {/* রেফারেন্সের মতো প্রায়-বর্গ ৪৪০px ফুটপ্রিন্ট */}
      <div
        className="relative w-full max-w-[440px] overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        {/* বন্ধ বাটন — উপরের ডান কোণে ওভারল্যাপিং */}
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="প্রমোশনাল পপআপ বন্ধ করুন"
          className="absolute -right-3 -top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-lg font-bold text-ink shadow-md hover:bg-surface-2"
        >
          ×
        </button>
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#fafaf7] shadow-2xl">
          {config.external ? (
            <a href={config.href} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
              <PromoArtwork />
            </a>
          ) : (
            <Link to={config.href} className="block h-full w-full">
              <PromoArtwork />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
