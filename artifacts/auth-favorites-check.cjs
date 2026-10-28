/* Logged-out / logged-in flows for Account (login+signup) and Favorites (heart). */
const { chromium } = require("playwright");

const BASE = "http://127.0.0.1:3000";
const step = [];
const ok = (name, detail = "") => step.push({ name, pass: true, detail });
const fail = (name, detail = "") => step.push({ name, pass: false, detail });

const emailA = `check.a.${Date.now()}@example.com`;
const emailB = `check.b.${Date.now()}@example.com`;
const PASSWORD = "strongpass123";

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 } });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("brm-promo-dismissed", "1"); // promos must not block clicks
    } catch {}
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text());
  });

  const session = () =>
    page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem("brm-session-v1") || "null");
      } catch {
        return null;
      }
    });
  const favoritesOf = (email) =>
    page.evaluate(
      (e) =>
        JSON.parse(localStorage.getItem("brm-favorites-v1") || "{}")[String(e).toLowerCase()] || [],
      email,
    );
  const dialog = page.locator('[role="dialog"][aria-label="লগইন বা নতুন অ্যাকাউন্ট"]');

  /* ── 1. logged-out heart opens the login/signup interface in place ── */
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.click('header button[aria-label="পছন্দের তালিকা"]');
  await dialog.waitFor({ state: "visible", timeout: 5000 }).then(
    () => ok("logged-out heart opens auth modal"),
    (e) => fail("logged-out heart opens auth modal", e.message),
  );
  const urlBefore = new URL(page.url()).pathname;
  urlBefore === "/" ? ok("no navigation to an unrelated page") : fail("stayed on page", page.url());
  const tabsOK = (await dialog.locator('[role="tab"]').allTextContents()).join("|");
  /লগইন/.test(tabsOK) && /নতুন অ্যাকাউন্ট/.test(tabsOK)
    ? ok("login + create-account tabs present", tabsOK)
    : fail("tabs present", tabsOK);
  const loginFields = await dialog.locator("form input").count();
  loginFields === 2
    ? ok("login tab has email + password", "email+password")
    : fail("login tab fields", `inputs=${loginFields}`);
  await dialog.locator('[role="tab"]', { hasText: "নতুন অ্যাকাউন্ট" }).click();
  const registerHas = {
    name: await dialog.locator("#reg-name").count(),
    email: await dialog.locator("#auth-email").count(),
    password: await dialog.locator("#auth-password").count(),
    terms: await dialog.locator('input[type="checkbox"]').count(),
  };
  registerHas.name && registerHas.email && registerHas.password && registerHas.terms
    ? ok("create-account tab has full name, email, password, terms", JSON.stringify(registerHas))
    : fail("register tab fields", JSON.stringify(registerHas));
  const googleVisible = await dialog.getByText("Google দিয়ে চালিয়ে যান").isVisible();
  googleVisible ? ok("Google sign-in UI present (honest placeholder)") : fail("Google UI missing");

  /* ── 2. register a new account from the modal (already on the register tab) ── */
  await dialog.locator("#reg-name").fill("চেক ব্যবহারকারী");
  await dialog.locator("#auth-email").fill(emailA);
  await dialog.locator("#auth-password").fill(PASSWORD);
  await dialog.locator('input[type="checkbox"]').check();
  await dialog.getByRole("button", { name: "অ্যাকাউন্ট তৈরি করুন" }).click();
  await page.waitForTimeout(900);
  const afterRegister = page.url();
  const s1 = await session();
  s1 && s1.email === emailA
    ? ok("registration creates a session")
    : fail("registration session", JSON.stringify(s1));
  afterRegister.includes("/profile") && afterRegister.includes("section=saved")
    ? ok("post-login return to intended favorites destination", afterRegister.replace(BASE, ""))
    : fail("intended destination", afterRegister.replace(BASE, ""));

  /* ── 3. session survives reload ── */
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  page.url().includes("/login") ? fail("session survives reload") : ok("session survives reload");
  const nameShown = await page.locator("h1").first().textContent();
  (nameShown || "").includes("চেক ব্যবহারকারী")
    ? ok("profile dashboard shows account name", nameShown)
    : fail("dashboard name", String(nameShown));

  /* ── 4. ❤️ on an article while logged in ── */
  await page.goto(`${BASE}/articles`, { waitUntil: "networkidle" });
  const href = await page.locator('a[href^="/articles/"]').first().getAttribute("href");
  await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
  const articleSlug = href.replace("/articles/", "");
  await page.locator('article button:has-text("❤️")').first().click();
  await page.waitForTimeout(400);
  const favText = await page.locator('article button:has-text("❤️")').first().textContent();
  const favList = await favoritesOf(emailA);
  favList.includes(articleSlug)
    ? ok("logged-in heart saves the article", `${articleSlug} → ${favText}`)
    : fail("heart saved article", JSON.stringify(favList));
  const pressed = await page.locator('article button:has-text("❤️")').first().getAttribute("aria-pressed");
  pressed === "true" ? ok("button reflects saved state (aria-pressed)") : fail("aria-pressed", String(pressed));

  /* ── 5. saved article appears in the favorites section ── */
  await page.goto(`${BASE}/profile?section=saved`, { waitUntil: "networkidle" });
  const savedPanel = await page.locator("main").innerText();
  savedPanel.includes("সেভ করা আর্টিকেল") && !savedPanel.includes("এখনো কোনো পছন্দের আর্টিকেল নেই")
    ? ok("favorites section lists the saved article")
    : fail("favorites section content", savedPanel.slice(0, 160).replace(/\n/g, " "));

  /* ── 6. logout then heart re-opens login (gate is real) ── */
  await page.locator("button:visible", { hasText: "লগআউট" }).first().click();
  await page.waitForTimeout(700);
  !(await session()) ? ok("logout clears the session") : fail("logout clears session");
  await page.click('header button[aria-label="পছন্দের তালিকা"]');
  await dialog.waitFor({ state: "visible", timeout: 5000 }).then(
    () => ok("after logout the heart asks for login again"),
    (e) => fail("post-logout gate", e.message),
  );

  /* ── 7. wrong password is rejected (no session created) ── */
  await dialog.locator("#auth-email").fill(emailA);
  await dialog.locator("#auth-password").fill("wrongpassword999");
  await dialog.getByRole("button", { name: "লগইন / রেজিস্ট্রেশন" }).click();
  await page.waitForTimeout(900);
  const alertText = await dialog.locator('[role="alert"]').textContent().catch(() => null);
  alertText && /পাসওয়ার্ড মেলেনি/.test(alertText)
    ? ok("wrong password shows a real error", alertText.trim())
    : fail("wrong password error", String(alertText));
  !(await session()) ? ok("wrong password creates no session") : fail("no session on bad password");

  /* ── 8. correct login returns to favorites and keeps them ── */
  await dialog.locator("#auth-password").fill(PASSWORD);
  await dialog.getByRole("button", { name: "লগইন / রেজিস্ট্রেশন" }).click();
  await page.waitForTimeout(1000);
  const s2 = await session();
  s2 && s2.email === emailA ? ok("login with correct password works") : fail("login", JSON.stringify(s2));
  const favAgain = await favoritesOf(emailA);
  favAgain.includes(articleSlug) ? ok("favorites persist across logout/login") : fail("favorites persist");

  /* ── 9. second account is isolated ── */
  await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  await page.locator("button:visible", { hasText: "লগআউট" }).first().click();
  await page.waitForTimeout(600);
  await page.click('header button[aria-label="পছন্দের তালিকা"]');
  await dialog.waitFor({ state: "visible", timeout: 5000 });
  await dialog.locator('[role="tab"]', { hasText: "নতুন অ্যাকাউন্ট" }).click();
  await dialog.locator("#reg-name").fill("দ্বিতীয় ব্যবহারকারী");
  await dialog.locator("#auth-email").fill(emailB);
  await dialog.locator("#auth-password").fill(PASSWORD);
  await dialog.locator('input[type="checkbox"]').check();
  await dialog.getByRole("button", { name: "অ্যাকাউন্ট তৈরি করুন" }).click();
  await page.waitForTimeout(1000);
  const favB = await favoritesOf(emailB);
  (await session())?.email === emailB ? ok("second account registers") : fail("second account");
  favB.length === 0
    ? ok("second account sees no other account's favorites")
    : fail("isolation", JSON.stringify(favB));

  /* ── 10. Account option -> login interface when logged out ── */
  await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  await page.locator("button:visible", { hasText: "লগআউট" }).first().click();
  await page.waitForTimeout(600);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.click('header a[href="/profile"]');
  await page.waitForTimeout(700);
  const loginURL = page.url();
  loginURL.includes("/login?next=") && decodeURIComponent(loginURL).includes("next=/profile")
    ? ok("logged-out Account click shows the login/signup interface", loginURL.replace(BASE, ""))
    : fail("account gate", loginURL.replace(BASE, ""));
  const tabsOnPage = (await page.locator('[role="tab"]').allTextContents()).join("|");
  /লগইন/.test(tabsOnPage) && /নতুন অ্যাকাউন্ট/.test(tabsOnPage)
    ? ok("login page renders the tabs")
    : fail("login page tabs", tabsOnPage);

  /* ── 11. login from that page lands on the dashboard ── */
  await page.locator("#auth-email").fill(emailB);
  await page.locator("#auth-password").fill(PASSWORD);
  await page.getByRole("button", { name: "লগইন / রেজিস্ট্রেশন" }).click();
  await page.waitForTimeout(1000);
  page.url().endsWith("/profile") && !page.url().includes("/login")
    ? ok("post-login lands on the account dashboard", page.url().replace(BASE, ""))
    : fail("dashboard redirect", page.url().replace(BASE, ""));

  await page.screenshot({ path: "artifacts/auth-dashboard.png" });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.click('header button[aria-label="পছন্দের তালিকা"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: "artifacts/auth-modal.png" });

  const failed = step.filter((s) => !s.pass);
  console.log(JSON.stringify({ passed: step.length - failed.length, total: step.length, steps: step, errors }, null, 2));
  await browser.close();
  if (failed.length) process.exit(1);
})().catch((e) => {
  console.error("CHECK CRASHED:", e.message);
  process.exit(1);
});
