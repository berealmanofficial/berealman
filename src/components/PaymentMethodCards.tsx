import { useState } from "react";
import type { PaymentProviderId, ProviderConfig } from "../lib/payments";

/**
 * পেমেন্ট মেথড কার্ড — বিকাশ / নগদ / রকেট (পার্সোনাল)।
 * ⚠️ লোগো: প্রজেক্টে অফিসিয়াল লোগো অ্যাসেট এখনো নেই, তাই ভুয়া/বানানো লোগো
 * বসানো হয়নি — প্রোভাইডার নাম (বাংলা+ইংরেজি) ও ব্র্যান্ড-অনুপ্রাণিত অ্যাকসেন্ট
 * ব্যবহার করা হয়েছে। অফিসিয়াল/অ্যাপ্রুভড অ্যাসেট প্রাপ্ত হলে Logo স্লটে বসবে।
 *
 * নির্বাচন (selection) প্রতিটি কার্ডেই কাজ করে — "রিসিভিং মেথড অ্যাডমিন-যাচাই হয়েছে কি না"
 * সেটি নির্বাচন আটকায় না; যাচাই-পূর্ব অবস্থা কার্ডে স্পষ্টভাবে লেখা থাকে এবং
 * নির্দেশনা-ধাপে অতিরিক্ত সতর্কবার্তা দেখানো হয় (নিচের checkout দেখো)।
 */

function CopyNumberButton({ number }: { number: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(number);
    } catch {
      // পুরনো ব্রাউজার/ক্লিপবোর্ড-না-থাকা: টেক্সট-সিলেক্ট ফলব্যাক
      const el = document.createElement("input");
      el.value = number;
      document.body.appendChild(el);
      el.select();
      document.execCommand?.("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <span className="relative">
      <button
        type="button"
        onClick={(e) => {
          // কপি করা আলাদা কাজ — কার্ড নির্বাচন যেন অনিচ্ছাকৃতভাবে বদলে না যায়
          e.stopPropagation();
          void copy();
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-2"
        title={`নম্বর কপি করো: ${number}`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </svg>
        কপি করো
      </button>
      {copied && (
        <span
          role="status"
          className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#1c1917] px-2 py-1 text-[11px] font-medium text-white shadow"
        >
          ✓ নম্বর কপি হয়েছে
        </span>
      )}
    </span>
  );
}

export function PaymentMethodCard({
  provider,
  selected,
  disabled,
  onSelect,
}: {
  provider: ProviderConfig;
  selected: boolean;
  disabled: boolean;
  onSelect: (id: PaymentProviderId) => void;
}) {
  const methodUnverified = !provider.verified;
  return (
    /**
     * কার্ডটি <button> নয় — ভিতরে “কপি করো” বাটন আছে, আর <button> এর ভিতরে <button>
     * অবৈধ HTML (React console error দিচ্ছিল)। তাই role="button" সহ div ব্যবহার করা হয়েছে:
     * ক্লিক/Enter/Space-এ কার্বন-সদৃশ আচরণ, একই ভিজ্যুয়াল ডিজাইন।
     */
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={selected}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onSelect(provider.id);
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(provider.id);
        }
      }}
      className={`flex w-full cursor-pointer flex-col gap-2 rounded-xl border-2 p-4 text-left transition-colors ${
        selected
          ? "border-brand bg-brand-soft"
          : disabled
            ? "cursor-not-allowed border-line bg-surface opacity-70"
            : "border-line bg-surface hover:border-brand-line"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* লোগো স্লট — অফিসিয়াল অ্যাসেট পেলে এখানে বসবে */}
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg font-bnserif text-sm font-black text-white"
            style={{ backgroundColor: provider.accent }}
            title={`${provider.nameEn} — অফিসিয়াল লোগো অ্যাসেট প্রাপ্ত হলে এখানে যুক্ত হবে`}
          >
            {provider.nameEn.charAt(0)}
          </span>
          <div>
            <p className="text-sm font-bold leading-tight">{provider.nameBn}</p>
            <p className="text-[11px] text-faint">{provider.nameEn}</p>
          </div>
        </div>
        <span
          aria-hidden
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
            selected ? "border-brand bg-brand text-white" : "border-line bg-surface"
          }`}
        >
          {selected && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="m4 12 6 6L20 6" />
            </svg>
          )}
        </span>
      </div>

      <div className="text-xs text-muted">
        <p>
          অ্যাকাউন্ট টাইপ: <strong>{provider.accountType}</strong> · প্রাপক নম্বর:{" "}
          <strong className="tracking-wide">{provider.recipientNumber}</strong>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CopyNumberButton number={provider.recipientNumber} />
        {methodUnverified && (
          <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-900">
            ⚠ রিসিভিং মেথড যাচাই করা হয়নি
          </span>
        )}
        {selected && (
          <span className="rounded-md bg-brand px-2 py-1 text-[11px] font-semibold text-white">
            নির্বাচিত
          </span>
        )}
      </div>
    </div>
  );
}
