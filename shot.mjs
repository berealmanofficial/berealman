import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// ১. হোম প্রথম ভিজিট — পপআপ সহ
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: 'artifacts/home-popup.png', fullPage: false });

// পপআপ বন্ধ করে হোম অর্ডার (হিরো → আর্টিকেল → ক্যাটেগরি…)
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.screenshot({ path: 'artifacts/home-top.png', fullPage: false });
await page.screenshot({ path: 'artifacts/home-full.png', fullPage: true });

// ২. লগইন পেজ
await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.screenshot({ path: 'artifacts/login-desktop.png', fullPage: true });

// ৩. প্রোফাইল পেজ
await page.goto('http://localhost:3000/profile', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.screenshot({ path: 'artifacts/profile-desktop.png', fullPage: false });
await page.screenshot({ path: 'artifacts/profile-full.png', fullPage: true });

// ৪. মোবাইল ভিউ
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: 'artifacts/home-popup-mobile.png', fullPage: false });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.screenshot({ path: 'artifacts/home-mobile.png', fullPage: false });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.screenshot({ path: 'artifacts/login-mobile.png', fullPage: true });

await browser.close();
console.log('shots ok');
