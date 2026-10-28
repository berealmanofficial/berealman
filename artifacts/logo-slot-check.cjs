/* Measures the header logo slot against the Wafilife reference proportions. */
const { chromium } = require("playwright");

const BASE = "http://127.0.0.1:3000";
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900, gutter: 24 },
  { name: "mobile", width: 375, height: 720, gutter: 16 },
];

async function measure(page) {
  return page.evaluate(() => {
    const img = document.querySelector('header img[alt="Be Real Man"]');
    const fallback = document.querySelector('header [title^="Be Real Man branding placeholder"]');
    const row = document.querySelector("header div.flex.items-center.gap-4");
    const heart = document.querySelector('header button[aria-label="পছন্দের তালিকা"]');
    const search = document.querySelector('header input[type="search"]');
    const rect = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return {
        x: +b.x.toFixed(1),
        y: +b.y.toFixed(1),
        w: +b.width.toFixed(1),
        h: +b.height.toFixed(1),
        right: +b.right.toFixed(1),
        bottom: +b.bottom.toFixed(1),
      };
    };
    return {
      mode: img && img.complete && img.naturalWidth > 0 ? "image" : fallback ? "fallback" : "none",
      row: rect(row),
      img: rect(img),
      search: rect(search),
      heart: rect(heart),
      natural: img ? { w: img.naturalWidth, h: img.naturalHeight } : null,
      docOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
}

(async () => {
  const label = process.argv[2] || "run";
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("brm-promo-dismissed", "1");
    } catch {}
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text());
  });

  const report = { label, results: [], errors };
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const m = await measure(page);

    const checks = {};
    if (m.mode === "image" && m.img && m.row) {
      const renderedRatio = m.img.w / m.img.h;
      const naturalRatio = m.natural.w / m.natural.h;
      checks.noDistortion = Math.abs(renderedRatio - naturalRatio) / naturalRatio < 0.02;
      checks.renderedRatio = +renderedRatio.toFixed(3);
      checks.naturalRatio = +naturalRatio.toFixed(3);
      checks.verticallyCentered =
        Math.abs(m.img.y + m.img.h / 2 - (m.row.y + m.row.h / 2)) <= 2;
      checks.centreDeltaPx = +(
        m.img.y + m.img.h / 2 - (m.row.y + m.row.h / 2)
      ).toFixed(2);
      checks.leftAlignedToGutter = Math.abs(m.img.x - (m.row.x + vp.gutter)) <= 2;
      checks.leftOffsetPx = +(m.img.x - m.row.x).toFixed(1);
      checks.logoHeightPx = m.img.h;
      checks.searchHeightPx = m.search ? m.search.h : null;
      checks.logoToSearchHeight = m.search ? +(m.img.h / m.search.h).toFixed(2) : null;
      if (m.heart) checks.clearsControls = m.img.right <= m.heart.x;
      checks.fitsViewport = !m.docOverflow && m.img.right <= vp.width;
    } else {
      checks.assetNotPresent = true;
      checks.fallbackMarkRendered = m.mode === "fallback";
    }
    checks.rowHeightPx = m.row ? m.row.h : null;
    report.results.push({ viewport: vp.name, mode: m.mode, checks, raw: m });
    await page.screenshot({ path: `artifacts/logo-${label}-${vp.name}.png` });
  }

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch((e) => {
  console.error("LOGO CHECK FAILED:", e.message);
  process.exit(1);
});
