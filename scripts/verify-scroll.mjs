// Verification: navigating to a different route must start at scrollY === 0.
// Runs against the deployed Preview URL in desktop + mobile emulation.
import { chromium, devices } from "playwright";

const BASE = process.env.PREVIEW_URL || "https://site-cc84e81e7ccd40eba6fa55de0e0153bb.freebuff.page";

// Start route -> a link selector to click (first matching link is used)
const FLOWS = [
  { start: "/courses", click: 'a[href^="/courses/"]', expect: "/courses/" },
  { start: "/articles", click: 'a[href^="/articles/"]', expect: "/articles/" },
  { start: "/books", click: 'a[href^="/books/"]', expect: "/books/" },
  { start: "/videos", click: 'a[href^="/videos/"]', expect: "/videos/" },
  { start: "/", click: 'a[href="/premium"]', expect: "/premium" },
  { start: "/search?q=বই", click: 'a[href^="/books/"], a[href^="/articles/"], a[href^="/categories/"], a[href^="/videos/"]', expect: null },
  { start: "/categories", click: 'a[href^="/categories/"]', expect: "/categories/" },
];

async function run(name, contextOptions) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(contextOptions);
  await ctx.addInitScript(() => sessionStorage.setItem("brm-promo-dismissed", "1"));
  const page = await ctx.newPage();
  const results = [];

  for (const flow of FLOWS) {
    try {
      await page.goto(BASE + flow.start, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(400);

      // Scroll down like a real user
      await page.evaluate(() => window.scrollTo(0, 1500));
      await page.waitForTimeout(250);
      const before = await page.evaluate(() => window.scrollY);

      const link = page.locator(flow.click).first();
      if ((await link.count()) === 0) {
        results.push({ ...flow, status: "SKIP (no link found)" });
        continue;
      }

      const [resp] = await Promise.all([
        link.click(),
        page.waitForURL((u) => u.pathname !== flow.start, { timeout: 15000 }),
      ]);
      // Wait long enough that even a slow smooth-scroll animation would finish
      await page.waitForTimeout(1200);

      const after = await page.evaluate(() => window.scrollY);
      const path = new URL(page.url()).pathname;
      const ok = after === 0;
      results.push({ from: flow.start, to: path, scrolledBefore: before, scrollAfter: after, status: ok ? "PASS" : "FAIL" });
    } catch (e) {
      results.push({ from: flow.start, status: "ERROR: " + e.message.split("\n")[0] });
    }
  }

  // Back/forward check: from a detail page, go Back and confirm no stale offset
  try {
    await page.goto(BASE + "/courses", { waitUntil: "networkidle", timeout: 25000 });
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.locator('a[href^="/courses/"]').first().click();
    await page.waitForURL(/\/courses\//, { timeout: 15000 });
    await page.waitForTimeout(600);
    await page.goBack();
    await page.waitForTimeout(1200);
    const backY = await page.evaluate(() => window.scrollY);
    results.push({ from: "detail", to: new URL(page.url()).pathname + " (back)", scrollAfter: backY, status: backY === 0 ? "PASS" : "FAIL" });
  } catch (e) {
    results.push({ from: "back-test", status: "ERROR: " + e.message.split("\n")[0] });
  }

  await browser.close();
  console.log("\n=== " + name + " ===");
  for (const r of results) console.log(JSON.stringify(r));
  const fails = results.filter((r) => !String(r.status).startsWith("PASS"));
  console.log(`passes: ${results.filter((r) => r.status === "PASS").length}/${results.length}`);
  return fails.length;
}

let failed = 0;
failed += await run("DESKTOP", { viewport: { width: 1366, height: 768 } });
failed += await run("MOBILE", { ...devices["iPhone 13"] });
process.exit(failed > 0 ? 1 : 0);
