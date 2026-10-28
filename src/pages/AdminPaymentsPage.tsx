import { useMemo, useState } from "react";
import { AdminGate } from "../lib/AdminGate";
import { useAdminAccess } from "../lib/adminGate";
import {
  approvePaymentRequest,
  contentTypeLabelBn,
  fmtDateTime,
  loadPaymentRequests,
  loadProviders,
  OWNER_RECIPIENT_NUMBER,
  rejectPaymentRequest,
  saveProviders,
  type PaymentRequest,
  type ProviderConfig,
} from "../lib/payments";
import { lookupContentItem } from "../lib/payments";

/* ───────────── হেল্পার ───────────── */

function bnNum(n: number) {
  return n.toLocaleString("bn-BD", { useGrouping: false });
}

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

function useRefresh() {
  const [, setTick] = useState(0);
  return () => setTick((t) => t + 1);
}

/** অ্যাডমিন পেমেন্ট ম্যানেজমেন্ট (+প্রোভাইডার কনফিগারেশন) */
export function AdminPaymentsPage() {
  const { unlocked, lock } = useAdminAccess();
  const refresh = useRefresh();
  const [requests, setRequests] = useState<PaymentRequest[]>(() => loadPaymentRequests());
  const [providers, setProvidersState] = useState<ProviderConfig[]>(() => loadProviders());
  const [filter, setFilter] = useState<"all" | PaymentRequest["status"]>("pending");
  const [q, setQ] = useState("");
  const [rejecting, setRejecting] = useState<PaymentRequest | null>(null);
  const [reason, setReason] = useState("");
  const [viewShot, setViewShot] = useState<PaymentRequest | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!unlocked) return <AdminGate title="পেমেন্ট ম্যানেজমেন্ট (অ্যাডমিন)" />;

  const providerName = (id: string) =>
    providers.find((p) => p.id === id)?.nameBn ?? id;

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return requests
      .filter((r) => (filter === "all" ? true : r.status === filter))
      .filter((r) => {
        if (!query) return true;
        return (
          r.id.toLowerCase().includes(query) ||
          r.fullName.toLowerCase().includes(query) ||
          r.txnId.toLowerCase().includes(query) ||
          r.itemTitle.toLowerCase().includes(query) ||
          (r.accountEmail ?? "").toLowerCase().includes(query)
        );
      });
  }, [requests, filter, q]);

  const verifyItem = (r: PaymentRequest) => lookupContentItem(r.contentType, r.itemSlug);

  /** অনুমোদন: এন্টাইটেলমেন্ট তৈরির একমাত্র পথ; রিপিট অ্যাকশন ইডেম্পোটেন্ট */
  const approve = (r: PaymentRequest) => {
    const item = verifyItem(r);
    if (!item) {
      setNotice(`⚠ ${r.id}: আইটেম (${r.itemSlug}) এখন স্টোরে নেই — দাম/আইটেম যাচাই করে তারপর সিদ্ধান্ত নাও।`);
      return;
    }
    if (item.price !== r.amount) {
      setNotice(`⚠ ${r.id}: জমা দেওয়া ৳${r.amount} বর্তমান দাম ৳${item.price} এর সাথে মেলে না — যাচাই করে তারপর অনুমোদন করো।`);
      return;
    }
    if (r.duplicateOf) {
      if (!confirm(`এই রিকোয়েস্টটি সন্দেহজনক ডুপ্লিকেট (#${r.duplicateOf}) হিসেবে চিহ্নিত। অনুমোদন করা হবে?`)) return;
    }
    if (!confirm(`#${r.id} অনুমোদন করবে? অনুমোদনের সাথে সাথে কনটেন্ট অ্যাক্সেস তৈরি হবে।`)) return;
    const updated = approvePaymentRequest(r.id);
    if (updated) {
      setNotice(`✓ #${r.id} অনুমোদিত — ${contentTypeLabelBn(updated.contentType)} "${updated.itemTitle}" অ্যাক্সেস তৈরি হয়েছে।`);
    }
    setRequests(loadPaymentRequests());
    refresh();
  };

  const reject = (r: PaymentRequest) => {
    if (reason.trim().length < 3) return;
    rejectPaymentRequest(r.id, reason);
    setRejecting(null);
    setReason("");
    setRequests(loadPaymentRequests());
    refresh();
  };

  const saveProviderCfg = (next: ProviderConfig[]) => {
    setProvidersState(next);
    saveProviders(next);
    setNotice("✓ প্রোভাইডার কনফিগারেশন সেভ হয়েছে।");
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-bnserif text-2xl font-bold">পেমেন্ট ম্যানেজমেন্ট</h1>
          <p className="mt-1 text-sm text-muted">
            ম্যানুয়াল ভেরিফিকেশন ওয়ার্কফ্লো — ফর্ম জমা = প্রমাণ নয়; যাচাই করেই অনুমোদন করো।
          </p>
        </div>
        <button onClick={lock} className="text-xs font-medium text-muted hover:text-ink">
          ⌨️ সেশন লক করো
        </button>
      </div>

      {notice && (
        <p className="mt-3 rounded-lg border border-line bg-brand-soft px-4 py-3 text-sm text-brand" role="status">
          {notice}
        </p>
      )}

      {/* প্রোভাইডার কনফিগারেশন */}
      <section className="mt-6 rounded-2xl border border-line bg-surface shadow-sm p-5">
        <h2 className="font-bnserif text-lg font-bold">প্রোভাইডার কনফিগারেশন</h2>
        <p className="mt-1 text-xs text-muted">
          প্রাপক নম্বর মালিকের দেওয়া ({OWNER_RECIPIENT_NUMBER}) দিয়ে প্রাথমিকভাবে সেট; রিসিভিং মেথড
          নিজে যাচাই করে তবেই verified চালু করো — যাচাই-পূর্ব কার্ডে "কনফিগারেশন প্রয়োজন" দেখায়।
        </p>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {providers.map((p, i) => (
            <div key={p.id} className="rounded-xl border border-line p-3">
              <p className="text-sm font-bold">
                <span
                  className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle"
                  style={{ backgroundColor: p.accent }}
                />
                {p.nameBn} <span className="text-xs text-faint">({p.nameEn})</span>
              </p>
              <label className="mt-2 block text-xs font-medium">
                প্রাপক নম্বর
                <input
                  value={p.recipientNumber}
                  onChange={(e) => {
                    const next = [...providers];
                    next[i] = { ...p, recipientNumber: e.target.value };
                    setProvidersState(next);
                  }}
                  className="mt-0.5 h-9 w-full rounded-md border border-line bg-surface px-2 text-sm"
                />
              </label>
              <label className="mt-2 block text-xs font-medium">
                সমর্থিত লেনদেন মেথড (যাচাই করা হলে)
                <input
                  value={p.method ?? ""}
                  placeholder="যেমন: Send Money / অনির্দিষ্ট"
                  onChange={(e) => {
                    const next = [...providers];
                    next[i] = { ...p, method: e.target.value.trim() || null };
                    setProvidersState(next);
                  }}
                  className="mt-0.5 h-9 w-full rounded-md border border-line bg-surface px-2 text-sm"
                />
              </label>
              <label className="mt-2 block text-xs font-medium">
                বাংলা নির্দেশনা (প্রতি লাইনে একটি ধাপ)
                <textarea
                  rows={3}
                  value={p.instructions ?? ""}
                  placeholder="নম্বরে টাকা পাঠাও… (নিজে যাচাই-করা ধাপ লিখো)"
                  onChange={(e) => {
                    const next = [...providers];
                    next[i] = { ...p, instructions: e.target.value.trim() || null };
                    setProvidersState(next);
                  }}
                  className="mt-0.5 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm"
                />
              </label>
              <label className="mt-2 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={p.verified}
                  onChange={(e) => {
                    const next = [...providers];
                    next[i] = { ...p, verified: e.target.checked, method: e.target.checked ? p.method ?? "অনির্দিষ্ট (অ্যাডমিন যাচাই)" : p.method };
                    setProvidersState(next);
                  }}
                  className="h-4 w-4 accent-[#047857]"
                />
                রিসিভিং মেথড ও নম্বর যাচাই করা হয়েছে
              </label>
            </div>
          ))}
        </div>
        <button
          onClick={() => saveProviderCfg(providers)}
          className="mt-3 rounded-lg bg-[#047857] px-4 py-2 text-sm font-semibold text-white hover:bg-[#065f46]"
        >
          কনফিগারেশন সেভ করো
        </button>
      </section>

      {/* রিকোয়েস্ট ফিল্টার + সার্চ */}
      <section className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                filter === f
                  ? "border-brand-line bg-brand-soft font-semibold text-brand"
                  : "border-line bg-surface text-muted hover:text-ink"
              }`}
            >
              {f === "pending" ? "যাচাইয়ের অপেক্ষায়" : f === "approved" ? "অনুমোদিত" : f === "rejected" ? "প্রত্যাখ্যাত" : "সব"}
            </button>
          ))}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="রিকোয়েস্ট নম্বর / গ্রাহক / ট্রানজেকশন আইডি / আইটেম…"
            className="ml-auto h-9 w-full max-w-xs rounded-md border border-line bg-surface px-3 text-sm"
          />
        </div>

        {/* রিকোয়েস্ট তালিকা */}
        <div className="mt-4 space-y-3">
          {filtered.length === 0 && (
            <p className="rounded-xl border border-dashed border-line bg-surface px-4 py-8 text-center text-sm text-muted">
              এই ফিল্টারে কোনো রিকোয়েস্ট নেই।
            </p>
          )}
          {filtered.map((r) => {
            const expected = verifyItem(r);
            const flagged = r.duplicateOf !== null;
            return (
              <div key={r.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bnserif text-base font-bold">#{r.id}</span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClasses(r.status)}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                  {flagged && (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                      ⚠ সন্দেহজনক ডুপ্লিকেট → #{r.duplicateOf}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm">
                  {contentTypeLabelBn(r.contentType)}: <strong>{r.itemTitle}</strong> · ৳ {bnNum(r.amount)}
                  {expected && expected.price !== r.amount && (
                    <span className="ml-2 text-xs font-semibold text-danger">বর্তমান দাম: ৳ {bnNum(expected.price)}</span>
                  )}
                  {!expected && <span className="ml-2 text-xs font-semibold text-danger">আইটেম স্টোরে নেই</span>}
                </p>
                <dl className="mt-2 grid gap-1.5 text-xs text-muted sm:grid-cols-2">
                  <div>গ্রাহক: <strong className="text-ink">{r.fullName}</strong></div>
                  <div>মোবাইল: <strong className="text-ink">{r.customerMobile}</strong></div>
                  <div>সেন্ডার: <strong className="text-ink">{r.senderMobile}</strong></div>
                  <div>প্রোভাইডার: <strong className="text-ink">{providerName(r.providerId)}</strong></div>
                  <div>ট্রানজেকশন আইডি: <strong className="text-ink">{r.txnId}</strong></div>
                  <div>অ্যাকাউন্ট: <strong className="text-ink">{r.accountEmail ?? "—"}</strong></div>
                  <div>জমার সময়: {fmtDateTime(r.createdAt)}</div>
                  {r.status === "rejected" && r.rejectReason && (
                    <div className="text-danger sm:col-span-2">প্রত্যাখ্যানের কারণ: {r.rejectReason}</div>
                  )}
                </dl>

                {/* অডিট ট্রেইল */}
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-brand hover:underline">অডিট ইতিহাস দেখো</summary>
                  <ul className="mt-1.5 space-y-1 text-[11px] text-muted">
                    {r.audit.map((a, i) => (
                      <li key={i}>
                        • {fmtDateTime(a.at)} — {a.action}
                        {a.note ? ` (${a.note})` : ""}
                      </li>
                    ))}
                  </ul>
                </details>

                <div className="mt-3 flex flex-wrap gap-2">
                  {r.screenshot && (
                    <button
                      onClick={() => setViewShot(r)}
                      className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-2"
                    >
                      📷 স্ক্রিনশট দেখো
                    </button>
                  )}
                  {r.status === "pending" && (
                    <>
                      <button
                        onClick={() => approve(r)}
                        className="rounded-lg bg-[#047857] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#065f46]"
                      >
                        ✓ অনুমোদন করো
                      </button>
                      <button
                        onClick={() => {
                          setRejecting(r);
                          setReason("");
                        }}
                        className="rounded-lg border border-danger/40 bg-danger-soft px-3 py-1.5 text-xs font-bold text-danger hover:bg-danger/10"
                      >
                        ✕ প্রত্যাখ্যান করো
                      </button>
                    </>
                  )}
                </div>

                {/* রিজেক্ট ইনপুট */}
                {rejecting?.id === r.id && (
                  <div className="mt-3 rounded-lg border border-danger/30 bg-danger-soft p-3">
                    <label className="block text-xs font-semibold text-danger">
                      প্রত্যাখ্যানের কারণ (গ্রাহক দেখবে) *
                      <textarea
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="যেমন: ট্রানজেকশন আইডি যাচাইয়ে মেলেনি — সঠিক কোড দিয়ে নতুন রিকোয়েস্ট জমা দাও।"
                        className="mt-1 w-full rounded-md border border-danger/40 bg-surface px-2 py-1.5 text-sm text-ink"
                      />
                    </label>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => reject(r)} className="rounded-lg bg-danger px-3 py-1.5 text-xs font-bold text-white">
                        প্রত্যাখ্যান নিশ্চিত করো
                      </button>
                      <button onClick={() => setRejecting(null)} className="rounded-lg border border-line px-3 py-1.5 text-xs">
                        বাতিল
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* স্ক্রিনশট ভিউ (শুধু অ্যাডমিন) */}
      {viewShot && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="পেমেন্ট স্ক্রিনশট"
          onClick={() => setViewShot(null)}
        >
          <div className="max-h-full w-full max-w-lg overflow-auto rounded-xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold">
              স্ক্রিনশট — #{viewShot.id} ({viewShot.itemTitle})
            </p>
            <img src={viewShot.screenshot ?? ""} alt="পেমেন্ট স্ক্রিনশট" className="mt-2 w-full rounded-lg border border-line" />
            <p className="mt-2 text-xs text-faint">
              স্ক্রিনশট = অটো-প্রমাণ নয়; ট্রানজেকশন আইডি হাতে-করে যাচাইই চূড়ান্ত।
            </p>
            <button onClick={() => setViewShot(null)} className="mt-3 rounded-lg border border-line px-3 py-1.5 text-sm">
              বন্ধ করো
            </button>
          </div>
        </div>
      )}

      <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        ⓘ সততা: এই প্যানেলের ডেটা এই ডিভাইসের localStorage-এ — প্রোডাকশনে ডেটাবেস + সার্ভার-সাইড
        অথরাইজেশন + সুরক্ষিত স্ক্রিনশট স্টোরেজ + ইমেইল ইনফ্রা লাগবে। ইমেইল নোটিফিকেশন এখনো কনফিগার নয়।
      </p>
    </div>
  );
}
