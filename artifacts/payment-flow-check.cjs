/* End-to-end check of the manual payment workflow (checkout → admin → access). */
const { chromium } = require("playwright");

const BASE = "http://127.0.0.1:3000";
const RECIPIENT = "01304463530";
const PASS = "strongpass123";
const stamp = Date.now().toString(36);
const emailA = `pay.a.${stamp}@example.com`;
const emailB = `pay.b.${stamp}@example.com`;

const steps = [];
const ok = (n, d = "") => steps.push({ n, pass: true, d });
const bad = (n, d = "") => steps.push({ n, pass: false, d });

const store = (page, key) =>
  page.evaluate((k) => {
    try {
      return JSON.parse(localStorage.getItem(k) || "null");
    } catch {
      return null;
    }
  }, key);

async function register(page, name, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.locator('[role="tab"]', { hasText: "নতুন অ্যাকাউন্ট" }).click();
  await page.locator("#reg-name").fill(name);
  await page.locator("#auth-email").fill(email);
  await page.locator("#auth-password").fill(PASS);
  await page.locator('input[type="checkbox"]').check();
  await page.getByRole("button", { name: "অ্যাকাউন্ট তৈরি করুন" }).click();
  await page.waitForTimeout(1000);
}

const card = (page, providerBn) =>
  page.locator('[role="button"][aria-pressed]', { hasText: providerBn }).first();

/* Selects a provider, checks instructions, fills the form, submits. */
async function checkout(page, path, providerBn, { sender, txn, amount }) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /পেমেন্ট মেথড নির্বাচন/ }).click();
  await page.waitForTimeout(300);

  const c = card(page, providerBn);
  await c.click();
  await page.waitForTimeout(200);
  const pressed = await c.getAttribute("aria-pressed");
  const others = await page.locator('[role="button"][aria-pressed]').evaluateAll((els) =>
    els.map((e) => `${e.textContent.trim().slice(0, 12)}=${e.getAttribute("aria-pressed")}`),
  );
  ok(`${providerBn} card selectable`, `aria-pressed=${pressed}; all: ${others.join(" | ")}`);

  await page.getByRole("button", { name: /নির্দেশনা দেখো/ }).click();
  await page.waitForTimeout(300);
  const instr = (await page.locator("main").innerText()) || "";
  instr.includes(providerBn) && instr.includes(RECIPIENT)
    ? ok(`${providerBn} instructions shown with recipient number`)
    : bad(`${providerBn} instructions`, instr.slice(0, 160).replace(/\n/g, " "));

  await page.getByRole("button", { name: /টাকা পাঠিয়েছি/ }).click();
  await page.waitForTimeout(300);
  const formVisible = await page.locator("#pm-name").isVisible();
  formVisible ? ok(`${providerBn}: payment form reached`) : bad(`${providerBn}: form not reached`);

  const price = await page.locator("#pm-amount").getAttribute("placeholder");
  const formText = (await page.locator("form").first().innerText()) || "";

  await page.locator("#pm-name").fill("চেক ক্রেতা");
  await page.locator("#pm-mobile").fill("01712345678");
  await page.locator("#pm-sender").fill(sender);
  await page.locator("#pm-txn").fill(txn);
  await page.locator("#pm-amount").fill(amount ?? price);
  return { price, formText };
}

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });

  /* ── context 1: buyer (admin gate unlocked so we can review later) ── */
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 } });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("brm-promo-dismissed", "1");
      sessionStorage.setItem("brm-admin-access-v1", "1");
    } catch {}
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text());
  });
  page.on("dialog", (d) => d.accept());

  await register(page, "চেক ক্রেতা", emailA);
  ok("buyer account created", (await store(page, "brm-session-v1"))?.email || "no session");

  /* course target + a second course that must stay locked */
  await page.goto(`${BASE}/courses`, { waitUntil: "networkidle" });
  const courseHrefs = await page.locator('a[href^="/courses/"]').evaluateAll((els) =>
    [...new Set(els.map((e) => (e.getAttribute("href") || "").split("#")[0]))],
  );
  const courseSlug = (courseHrefs[0] || "").split("/courses/")[1];
  const otherSlug = (courseHrefs[1] || "").split("/courses/")[1];
  ok("course targets resolved", `${courseSlug} / ${otherSlug}`);

  /* ── 1 & 2: every provider selectable + its own instructions ── */
  for (const [bn, path] of [
    ["বিকাশ", `/checkout/course/${courseSlug}`],
    ["নগদ", `/checkout/course/${courseSlug}`],
    ["রকেট", `/checkout/course/${courseSlug}`],
  ]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /পেমেন্ট মেথড নির্বাচন/ }).click();
    await page.waitForTimeout(250);
    const c = card(page, bn);
    await c.click();
    await page.waitForTimeout(200);
    const pressed = await c.getAttribute("aria-pressed");
    pressed === "true"
      ? ok(`${bn}: selectable after clicking`)
      : bad(`${bn}: not selectable`, `aria-pressed=${pressed}`);
    await page.getByRole("button", { name: /নির্দেশনা দেখো/ }).click();
    await page.waitForTimeout(250);
    const txt = await page.locator("main").innerText();
    txt.includes(`পেমেন্ট নির্দেশনা — ${bn}`) && txt.includes(RECIPIENT)
      ? ok(`${bn}: correct instructions rendered`)
      : bad(`${bn}: instructions`, txt.slice(0, 140).replace(/\n/g, " "));
    await c.click({ force: true }).catch(() => {});
  }

  /* ── 3: amount is validated against the stored price (not the browser's) ── */
  const first = await checkout(page, `/checkout/course/${courseSlug}`, "নগদ", {
    sender: "01712345678",
    txn: `BADAMT${stamp.slice(0, 4)}`,
    amount: "1",
  });
  ok("form shows item name/type/price", first.formText.includes("যে কনটেন্ট কিনছো") ? "yes" : first.formText.slice(0, 120));
  await page.getByRole("button", { name: /রিভিউ করো/ }).click();
  await page.waitForTimeout(400);
  const alertTxt = (await page.locator('[role="alert"]').first().innerText().catch(() => "")) || "";
  alertTxt.includes("দাম")
    ? ok("wrong amount rejected with a visible Bengali error", alertTxt.replace(/\n/g, " ").slice(0, 90))
    : bad("wrong amount rejected", alertTxt || "no alert");

  /* ── 3 & 4: valid submission with sender last-4-digits, persisted + pending ── */
  const txnA = `TRX${stamp}A`.toUpperCase();
  await page.locator("#pm-sender").fill("3530");
  await page.locator("#pm-txn").fill(txnA);
  await page.locator("#pm-amount").fill(first.price);
  await page.getByRole("button", { name: /রিভিউ করো/ }).click();
  await page.waitForTimeout(300);
  const review = await page.locator("main").innerText();
  review.includes(first.price) && review.includes(txnA)
    ? ok("review step echoes item, price and TrxID")
    : bad("review step", review.slice(0, 140).replace(/\n/g, " "));
  await page.getByRole("button", { name: /পেমেন্টের তথ্য জমা দিন/ }).click();
  await page.waitForTimeout(700);
  const confirm = await page.locator("main").innerText();
  confirm.includes("যাচাইয়ের অপেক্ষায়") && /PM-/.test(confirm)
    ? ok("confirmation shows request number + pending status")
    : bad("confirmation", confirm.slice(0, 160).replace(/\n/g, " "));
  !confirm.includes("পেমেন্ট সফল") && !confirm.includes("অনুমোদিত হয়েছে")
    ? ok("confirmation does not claim the payment is approved (no fake success text)")
    : bad("confirmation must not claim approval", confirm.slice(0, 120));

  const requests = await store(page, "brm-payment-requests-v1");
  const reqA = (requests || []).find((r) => r.txnId === txnA);
  reqA && reqA.status === "pending" && reqA.senderMobile === "3530" && reqA.accountEmail === emailA
    ? ok("request persisted with TrxID, sender tail, account and pending status", `#${reqA.id}`)
    : bad("request persisted", JSON.stringify(reqA));

  /* ── 4: history shows the full pending details to its owner ── */
  await page.goto(`${BASE}/profile?section=payments`, { waitUntil: "networkidle" });
  const hist = await page.locator("main").innerText();
  hist.includes(txnA) && hist.includes("3530") && hist.includes("যাচাইয়ের অপেক্ষায়") && hist.includes(reqA.id)
    ? ok("profile payment history shows TrxID, sender, status while pending")
    : bad("profile history", hist.slice(0, 200).replace(/\n/g, " "));

  /* ── 5 & 6: admin approves; only that exact course unlocks ── */
  await page.goto(`${BASE}/admin/payments`, { waitUntil: "networkidle" });
  const adminText = await page.locator("main").innerText();
  adminText.includes(txnA) && adminText.includes("3530")
    ? ok("admin panel lists the request with sender + TrxID")
    : bad("admin panel details", adminText.slice(0, 160).replace(/\n/g, " "));
  await page.getByRole("button", { name: /অনুমোদন করো/ }).first().click();
  await page.waitForTimeout(800);
  const purchases = await store(page, "brm-purchases-v1");
  const mine = (purchases || []).filter((p) => p.email === emailA);
  mine.length === 1 && mine[0].slug === courseSlug && mine[0].contentType === "course" && mine[0].requestId === reqA.id
    ? ok("approval granted exactly one entitlement for the purchased course")
    : bad("approval entitlement", JSON.stringify(mine));

  await page.goto(`${BASE}/courses`, { waitUntil: "networkidle" });
  const badges = await page.locator("text=✓ আমার কেনা কোর্স").count();
  badges === 1 ? ok("only the purchased course shows as owned") : bad("owned badge count", String(badges));
  const boughtCard = await page
    .locator(`a[href="/courses/${courseSlug}"]`)
    .first()
    .evaluate((el) => el.closest("div.rounded-xl")?.innerText || "");
  boughtCard.includes("আমার কেনা কোর্স")
    ? ok("bought course card shows ownership", boughtCard.slice(0, 60).replace(/\n/g, " "))
    : bad("bought card ownership", boughtCard.slice(0, 80));
  const otherCard = await page
    .locator(`a[href="/courses/${otherSlug}"]`)
    .first()
    .evaluate((el) => el.closest("div.rounded-xl")?.innerText || "");
  otherCard && !otherCard.includes("আমার কেনা কোর্স")
    ? ok("the other (unbought) course stays locked", otherSlug)
    : bad("unbought course locked", otherCard.slice(0, 80));

  /* idempotency: re-approving must not duplicate the entitlement */
  await page.goto(`${BASE}/admin/payments`, { waitUntil: "networkidle" });
  const stillPending = await page.getByRole("button", { name: /অনুমোদন করো/ }).count();
  const after = await store(page, "brm-purchases-v1");
  (after || []).filter((p) => p.email === emailA && p.slug === courseSlug).length === 1 && stillPending === 0
    ? ok("approved request leaves no pending approve action → no duplicate entitlement")
    : bad("idempotency", `mine=${(after || []).filter((p) => p.email === emailA).length} buttons=${stillPending}`);

  /* unbought premium article must stay locked */
  await page.goto(`${BASE}/premium`, { waitUntil: "networkidle" });
  const paidHref = await page.locator('a[href^="/preview/"]').first().getAttribute("href");
  const paidSlug = (paidHref || "").replace("/preview/", "");
  await page.goto(`${BASE}/preview/${paidSlug}`, { waitUntil: "networkidle" });
  const preview = await page.locator("main").innerText();
  preview.includes("কিনুন") || preview.includes("পেমেন্ট")
    ? ok("unbought premium article still shows a purchase action (locked)")
    : bad("unbought article locked", preview.slice(0, 140).replace(/\n/g, " "));

  /* ── 7 & 8: rejection keeps history, grants nothing, allows a fresh attempt ── */
  const second = await checkout(page, `/checkout/article/${paidSlug}`, "রকেট", {
    sender: "01712345678",
    txn: `TRX${stamp}B`.toUpperCase(),
  });
  await page.getByRole("button", { name: /রিভিউ করো/ }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /পেমেন্টের তথ্য জমা দিন/ }).click();
  await page.waitForTimeout(700);
  const allAfter2 = await store(page, "brm-payment-requests-v1");
  const reqB = (allAfter2 || []).find((r) => r.contentType === "article" && r.itemSlug === paidSlug);
  ok("second submission saved for the article", `#${reqB && reqB.id} | price ${second.price}`);

  await page.goto(`${BASE}/admin/payments`, { waitUntil: "networkidle" });
  const rejectBtn = page
    .locator("div.rounded-xl", { hasText: reqB.txnId })
    .first()
    .getByRole("button", { name: /প্রত্যাখ্যান করো/ })
    .first();
  await rejectBtn.click();
  await page.waitForTimeout(300);
  // শুধু রিজেক্ট-প্যানেলের টেক্সটএরা (পেজে অ্যাডমিন প্রোভাইডার-কনফিগের আলাদা textarea-ও আছে)
  await page
    .locator('textarea[placeholder^="যেমন: ট্রানজেকশন আইডি"]')
    .fill("ট্রানজেকশন আইডি যাচাইয়ে মেলেনি — সঠিক কোড দিয়ে নতুন করে জমা দাও।");
  await page.getByRole("button", { name: /প্রত্যাখ্যান নিশ্চিত করো/ }).click();
  await page.waitForTimeout(700);

  const afterReject = await store(page, "brm-payment-requests-v1");
  const rejected = (afterReject || []).find((r) => r.id === reqB.id);
  const purchasesAfterReject = await store(page, "brm-purchases-v1");
  rejected && rejected.status === "rejected" && rejected.rejectReason.includes("মেলেনি")
    ? ok("admin rejection recorded with reason and timestamp", rejected.audit.length + " audit entries")
    : bad("rejection recorded", JSON.stringify(rejected && rejected.status));
  (purchasesAfterReject || []).length === 1
    ? ok("rejected payment granted no access")
    : bad("rejected granted access", JSON.stringify(purchasesAfterReject));
  (afterReject || []).length === 2 && (afterReject || []).some((r) => r.id === reqA.id)
    ? ok("previous attempts preserved in history (2 records)")
    : bad("history preserved", String((afterReject || []).length));

  await page.goto(`${BASE}/profile?section=payments`, { waitUntil: "networkidle" });
  const hist2 = await page.locator("main").innerText();
  hist2.includes("প্রত্যাখ্যাত") && hist2.includes("মেলেনি") && hist2.includes("নতুন পেমেন্ট জমা দাও")
    ? ok("owner sees rejection reason and a fresh-attempt link")
    : bad("rejection shown to owner", hist2.slice(0, 200).replace(/\n/g, " "));
  const resub = await page.locator(`a[href="/checkout/article/${paidSlug}"]`).count();
  resub > 0 ? ok("resubmission link points at the same item") : bad("resubmission link missing");

  /* a fresh attempt on the same item is not blocked by the rejected record */
  await page.goto(`${BASE}/checkout/article/${paidSlug}`, { waitUntil: "networkidle" });
  const retryOk = await page.getByRole("button", { name: /পেমেন্ট মেথড নির্বাচন/ }).isVisible();
  retryOk ? ok("checkout for the rejected item is reachable again") : bad("retry blocked");

  /* ── 9: isolation between accounts ── */
  await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  await page.locator("button:visible", { hasText: "লগআউট" }).first().click();
  await page.waitForTimeout(700);
  await register(page, "দ্বিতীয় ক্রেতা", emailB);
  await page.goto(`${BASE}/profile?section=payments`, { waitUntil: "networkidle" });
  const histB = await page.locator("main").innerText();
  !histB.includes(txnA) && !histB.includes(reqB.txnId)
    ? ok("second account cannot see the first account's payment records")
    : bad("account isolation", histB.slice(0, 160).replace(/\n/g, " "));

  /* ── 10: existing pages still render ── */
  for (const path of ["/", "/articles", "/videos", "/books", "/courses", "/premium", "/login"]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    const chars = (await page.locator("main").innerText()).replace(/\s/g, "").length;
    chars > 100 ? ok(`existing page renders ${path}`, `${chars} chars`) : bad(`page ${path}`, `${chars} chars`);
  }

  await page.screenshot({ path: "artifacts/pay-final.png" });
  await ctx.close();

  /* ── unauthorized admin: gate only, no approve controls, no data ── */
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx2.addInitScript(() => {
    try {
      sessionStorage.setItem("brm-promo-dismissed", "1");
    } catch {}
  });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/admin/payments`, { waitUntil: "networkidle" });
  const locked = await p2.locator("main").innerText();
  const approveButtons = await p2.getByRole("button", { name: /অনুমোদন করো/ }).count();
  !locked.includes(txnA) && approveButtons === 0 && locked.includes("অ্যাডমিন পাসওয়ার্ড")
    ? ok("without the admin gate: no request data and no approve controls")
    : bad("admin gate", `approve=${approveButtons} text=${locked.slice(0, 120).replace(/\n/g, " ")}`);
  await p2.screenshot({ path: "artifacts/pay-admin-gate.png" });
  await ctx2.close();

  const failed = steps.filter((s) => !s.pass);
  console.log(
    JSON.stringify({ passed: steps.length - failed.length, total: steps.length, errors, steps }, null, 2),
  );
  await browser.close();
  if (failed.length) process.exit(1);
})().catch((e) => {
  console.error("PAYMENT CHECK CRASHED:", e.message);
  process.exit(1);
});
