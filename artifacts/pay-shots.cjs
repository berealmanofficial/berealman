const { chromium } = require("playwright");
const BASE = "http://127.0.0.1:3000";
(async () => {
  const b = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const c = await b.newContext({ viewport: { width: 1280, height: 1000 } });
  await c.addInitScript(() => { try { sessionStorage.setItem("brm-promo-dismissed", "1"); } catch {} });
  const p = await c.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 80)); });
  await p.goto(`${BASE}/checkout/course/atmunnayon-atmobishwash`, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /পেমেন্ট মেথড নির্বাচন/ }).click();
  await p.waitForTimeout(300);
  await p.locator('[role="button"][aria-pressed]', { hasText: "নগদ" }).first().click();
  await p.waitForTimeout(200);
  await p.screenshot({ path: "artifacts/pay-step2-methods.png" });
  await p.getByRole("button", { name: /নির্দেশনা দেখো/ }).click();
  await p.waitForTimeout(300);
  await p.screenshot({ path: "artifacts/pay-step3-instructions.png" });
  await p.getByRole("button", { name: /টাকা পাঠিয়েছি/ }).click();
  await p.waitForTimeout(300);
  await p.screenshot({ path: "artifacts/pay-step4-form.png" });
  const shape = await p.evaluate(() => {
    const el = document.querySelector('[role="button"][aria-pressed]');
    return { nestedButtons: document.querySelectorAll("button button").length, cardTag: el && el.tagName, cardRole: el && el.getAttribute("role") };
  });
  console.log(JSON.stringify({ shape, errors: errs }));
  await b.close();
})().catch(e => { console.error("SHOTS FAILED:", e.message); process.exit(1); });
