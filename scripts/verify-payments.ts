/**
 * Payments workflow verification (runs the REAL src/lib/payments.ts logic).
 * Executed via esbuild bundle: esbuild --bundle --platform=node --format=esm.
 */
import assert from "node:assert";

// localStorage/sessionStorage shim
const store = new Map<string, string>();
const g = globalThis as Record<string, unknown>;
g.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
g.sessionStorage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };

const payments = await import("../src/lib/payments.ts");
const {
  DEFAULT_PROVIDERS,
  OWNER_RECIPIENT_NUMBER,
  loadProviders,
  lookupContentItem,
  validatePaymentDraft,
  isValidBdMobile,
  isValidTxnId,
  isValidSenderTail,
  createPaymentRequest,
  approvePaymentRequest,
  rejectPaymentRequest,
  loadPaymentRequests,
  hasPurchase,
  loadPurchases,
} = payments;
// course entitlement check from the course store (course access rules)
const { hasEntitlement } = await import("../src/lib/coursesStore.ts");

/* ── 1. Provider configuration ── */
assert.strictEqual(DEFAULT_PROVIDERS.length, 3, "three providers configured");
for (const p of DEFAULT_PROVIDERS) {
  assert.strictEqual(p.recipientNumber, OWNER_RECIPIENT_NUMBER);
  assert.strictEqual(p.recipientNumber, "01304463530", "owner-supplied number on every card");
  assert.strictEqual(p.accountType, "Personal");
  assert.strictEqual(p.verified, false, "receiving method NOT verified by default → config-required state");
  assert.strictEqual(p.method, null, "no invented transaction method");
}
assert.strictEqual(loadProviders()[0].nameBn, "বিকাশ পার্সোনাল");
console.log("✓ provider config: 3 cards, correct number 01304463530, Personal, verification pending");

/* ── 2. Content lookup uses CURRENT store prices (not browser values) ── */
const paidArticle = lookupContentItem("article", "before-marriage")!; // seed paid article
assert.ok(paidArticle, "paid article resolves");
assert.strictEqual(paidArticle.price, 60);
assert.strictEqual(lookupContentItem("article", "tobacco-truth"), null, "free articles are NOT purchasable");
assert.strictEqual(lookupContentItem("book", "real-man-path")!.price, 350);
assert.strictEqual(lookupContentItem("course", "atmunnayon-atmobishwash")!.price, 499);
assert.strictEqual(lookupContentItem("article", "nonexistent-slug"), null, "invalid item rejected");
console.log("✓ content lookup: correct item+price mapping for all three types; invalid/free rejected");

/* ── 3. Validation rules ── */
assert.strictEqual(isValidBdMobile("01304463530"), true);
assert.strictEqual(isValidBdMobile("01012345678"), false, "invalid operator prefix");
assert.strictEqual(isValidBdMobile("0130446353"), false, "10 digits rejected");
assert.strictEqual(isValidTxnId("8A4X2Y91ZZ"), true);
assert.strictEqual(isValidTxnId("ab"), false, "too short");
assert.strictEqual(isValidTxnId("with<space> no"), false, "spaces rejected");

const provider = loadProviders().find((p) => p.id === "bkash")!;
const baseDraft = {
  providerId: "bkash" as const,
  fullName: "রফিকুল ইসলাম",
  customerMobile: "01712345678",
  senderMobile: "01712345678",
  txnId: "8A4X2Y91ZZ",
  amount: String(paidArticle.price),
  screenshot: null,
};

// The requirement changed: selection + submission are open for all three methods, and the
// "receiving method admin-verified?" flag is advisory only. So an unverified provider must NOT
// block submission — but no false verification claim may exist, and access still comes only
// from admin approval (asserted below).
let errs = validatePaymentDraft("article", paidArticle.slug, baseDraft, loadProviders());
assert.strictEqual(errs.length, 0, "unverified provider does not block submission");
assert.strictEqual(
  loadProviders().every((p) => p.verified === false),
  true,
  "no provider is falsely marked verified",
);

// sender: full 11-digit number OR the last 4+ digits of the sending number
assert.strictEqual(isValidSenderTail("3530"), true);
assert.strictEqual(isValidSenderTail("12"), false, "too short");
const tailDraft = { ...baseDraft, senderMobile: "3530" };
assert.strictEqual(
  validatePaymentDraft("article", paidArticle.slug, tailDraft, loadProviders()).length,
  0,
  "sender last-digits accepted",
);
assert.ok(
  validatePaymentDraft("article", paidArticle.slug, { ...baseDraft, senderMobile: "12" }, loadProviders()).some(
    (e) => e.includes("সেন্ডার"),
  ),
  "too-short sender refused",
);

// wrong amount rejected
const withWrongAmount = { ...baseDraft, amount: "99" };
errs = validatePaymentDraft("article", paidArticle.slug, withWrongAmount, loadProviders());
assert.ok(errs.some((e) => e.includes("বর্তমান দাম")), "amount must equal current price");

// unknown item rejected
errs = validatePaymentDraft("article", "no-such-item", baseDraft, loadProviders());
assert.ok(errs.length > 0, "invalid item id blocked");
console.log(
  "✓ validation: mobile format (full or last-4 sender), txn id, amount, item id — enforced; provider verified-flag is advisory",
);

/* ── 4. Request lifecycle: submission does NOT grant access ── */
payments.saveProviders(DEFAULT_PROVIDERS.map((p) => ({ ...p, verified: true, method: "Send Money (যাচাইকৃত)", instructions: "নম্বরে টাকা পাঠাও, রেফারেন্স রাখো।" })));

const res = createPaymentRequest("article", paidArticle.slug, baseDraft, "user@example.com");
assert.ok(res.ok, "valid request saves");
const req = res.ok ? res.request : null;
assert.ok(req);
assert.strictEqual(req.status, "pending");
assert.strictEqual(req.amount, 60, "amount forced to current store price");
assert.strictEqual(hasPurchase("article", paidArticle.slug, "user@example.com"), false, "NO ACCESS after submission");
assert.strictEqual(loadPurchases().length, 0);

// duplicate submission (same provider+txn+amount) → flagged, not auto-validated
const res2 = createPaymentRequest("article", paidArticle.slug, baseDraft, "user@example.com");
assert.ok(res2.ok);
assert.strictEqual(res2.ok && res2.request.duplicateOf, req!.id, "suspicious duplicate flagged");
assert.strictEqual(res2.ok && res2.request.status, "pending", "duplicate still just pending");
console.log("✓ submission: request saved as pending/যাচাইয়ের অপেক্ষায়; duplicate flagged for admin review; no access granted");

/* ── 5. Approval is the ONLY path to access; idempotent ── */
const approved = approvePaymentRequest(req!.id, "হাতে-যাচাই সম্পন্ন");
assert.ok(approved);
assert.strictEqual(approved.status, "approved");
assert.strictEqual(hasPurchase("article", paidArticle.slug, "user@example.com"), true, "admin approval grants entitlement");

// repeated approval must not duplicate entitlements
const again = approvePaymentRequest(req!.id);
assert.strictEqual(again, null, "repeated approval is a no-op");
assert.strictEqual(
  loadPurchases().filter((p) => p.contentType === "article" && p.slug === paidArticle.slug).length,
  1,
  "exactly one entitlement record",
);
// users without matching email cannot see the purchase
assert.strictEqual(hasPurchase("article", paidArticle.slug, "someone-else@example.com"), false);
assert.strictEqual(hasPurchase("article", paidArticle.slug, null), false, "email-checked ownership");
console.log("✓ approval: entitlement created exactly once, tied to account email");

/* ── 6. Pending + rejected never grant access ── */
const course = lookupContentItem("course", "atmunnayon-atmobishwash")!;
const draftCourse = { ...baseDraft, amount: String(course.price), screenshot: null };
const r3 = createPaymentRequest("course", course.slug, draftCourse, "buyer@example.com");
assert.ok(r3.ok);
if (!r3.ok) throw new Error("unreachable");
const r3req = r3.request;
assert.strictEqual(r3req.duplicateOf, null, "different txn id not flagged");
assert.strictEqual(hasEntitlement(course.slug, "buyer@example.com"), false, "pending course payment grants NOTHING");

const rejected = rejectPaymentRequest(r3req.id, "ট্রানজেকশন আইডি যাচাইয়ে মেলেনি");
assert.ok(rejected);
assert.strictEqual(rejected.status, "rejected");
assert.strictEqual(hasEntitlement(course.slug, "buyer@example.com"), false, "rejected payment does NOT grant access");

// reject without reason is refused
const r4 = createPaymentRequest("book", "real-man-path", { ...baseDraft, txnId: "DIFFERENT1", amount: "350" }, "b2@example.com");
assert.ok(r4.ok);
if (!r4.ok) throw new Error("unreachable");
assert.strictEqual(rejectPaymentRequest(r4.request.id, "hi"), null, "too-short reason refused");
assert.strictEqual(rejectPaymentRequest("no-such-id", "some reason"), null, "unknown id refused");
console.log("✓ access rules: pending → no access, rejected → no access, bad reason/unknown id refused");

/* ── 7. Persistence across reload ── */
const reloaded = loadPaymentRequests();
assert.ok(reloaded.length >= 3);
assert.strictEqual(reloaded.find((r) => r.id === req!.id)!.status, "approved", "request persists with status");
assert.ok(loadPurchases().some((p) => p.slug === paidArticle.slug), "purchase persists");
console.log("✓ persistence: requests + entitlements survive reload");

console.log("\nALL PAYMENTS TESTS PASS ✔");
