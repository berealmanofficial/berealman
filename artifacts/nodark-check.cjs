/* Verifies the site stays in the light theme even when the OS prefers dark. */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 950 },
    colorScheme: "dark", // emulate a user whose system is in dark mode
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text());
  });

  // Simulate a stale saved dark preference from the removed theme system.
  await page.addInitScript(() => {
    try {
      localStorage.setItem("brm-theme", "dark");
      localStorage.setItem("brm-promo-dismissed", "1");
    } catch {}
  });

  const probe = () =>
    page.evaluate(() => ({
      htmlClass: document.documentElement.className,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      bodyColor: getComputedStyle(document.body).color,
      headerBg: document.querySelector("header")
        ? getComputedStyle(document.querySelector("header")).backgroundColor
        : null,
      systemPrefersDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
      themeTogglePresent: !!document.querySelector(
        '[aria-label*="মোড"], [aria-label*="mode"], [aria-label*="theme"]',
      ),
      moonSunInHeader: /[🌙☀️]/.test(document.querySelector("header")?.textContent || ""),
      rootChildren: document.getElementById("root")?.children.length ?? 0,
      visibleChars: document.body.innerText.trim().length,
      h1: (document.querySelector("h1") || {}).textContent?.trim() ?? null,
    }));

  await page.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const home = await probe();
  await page.screenshot({ path: "artifacts/nodark-home-dark-pref.png" });

  await page.goto("http://127.0.0.1:3000/videos", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const videos = await probe();
  await page.screenshot({ path: "artifacts/nodark-videos-dark-pref.png" });

  console.log(JSON.stringify({ home, videos, errors }, null, 2));
  await browser.close();
})().catch((e) => {
  console.error("CHECK FAILED:", e.message);
  process.exit(1);
});
