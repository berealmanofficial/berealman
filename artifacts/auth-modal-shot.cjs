const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const c = await b.newContext({ viewport: { width: 1280, height: 950 } });
  await c.addInitScript(() => { try { sessionStorage.setItem("brm-promo-dismissed", "1"); } catch {} });
  const p = await c.newPage();
  const errs = [];
  p.on("pageerror", e => errs.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await p.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });
  const urlBefore = p.url();
  await p.click('header button[aria-label="পছন্দের তালিকা"]');
  await p.waitForTimeout(700);
  await p.screenshot({ path: "artifacts/auth-modal-loggedout.png" });
  await p.locator('[role="tab"]', { hasText: "নতুন অ্যাকাউন্ট" }).click();
  await p.waitForTimeout(300);
  await p.screenshot({ path: "artifacts/auth-modal-register.png" });
  console.log(JSON.stringify({
    urlUnchanged: urlBefore === p.url(),
    dialogs: await p.locator('[role="dialog"][aria-label="লগইন বা নতুন অ্যাকাউন্ট"]').count(),
    pageBehindVisible: (await p.locator("header").innerText()).length > 0,
    errors: errs,
  }));
  await b.close();
})().catch(e => { console.error("SHOT FAILED:", e.message); process.exit(1); });
