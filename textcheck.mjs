import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await b.newPage();
await p.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
console.log('LOGIN CAPTION:', await p.locator('div.flex-col.items-center p').first().innerText());

await p.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await p.keyboard.press('Escape');
await p.waitForTimeout(300);
console.log('HOME SECTION HEADINGS:', (await p.locator('h2').allInnerTexts()).join(' | '));
console.log('FREE CARDS:', await p.locator('a h3').count());
console.log('CARD LINKS:', (await p.locator('section a[href^="/articles/"]').evaluateAll(els => els.slice(0, 4).map(e => e.getAttribute('href')))).join(', '));

// পপআপ DOM যাচাই (নতুন কনটেক্সট → session flag নতুন)
const c2 = await b.newPage();
await c2.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
console.log('POPUP VISIBLE:', await c2.locator('[role="dialog"]').count());
console.log('POPUP CLOSE LABEL:', await c2.locator('[role="dialog"] button').first().getAttribute('aria-label'));
console.log('POPUP ART LINE:', await c2.locator('[role="dialog"] p').first().innerText());

// বন্ধ করে আবার হোমে ফিরে গেলে পপআপ আসা উচিত নয়
await c2.keyboard.press('Escape');
await c2.waitForTimeout(300);
console.log('AFTER DISMISS, DIALOG COUNT:', await c2.locator('[role="dialog"]').count());
await c2.goto('http://localhost:3000/profile', { waitUntil: 'networkidle' });
await c2.goBack();
await c2.waitForTimeout(400);
console.log('BACK TO HOME, DIALOG COUNT (expect 0):', await c2.locator('[role="dialog"]').count());

await b.close();
console.log('textcheck done');
