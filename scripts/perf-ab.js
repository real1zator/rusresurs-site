const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:4321/index.html';

async function run(browser, label, blocked) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  if (blocked.length) {
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (blocked.some((b) => url.includes(b))) return route.abort();
      return route.continue();
    });
  }
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const res = await page.evaluate(() => new Promise((resolve) => {
    const times = [];
    let last = performance.now();
    const t0 = last;
    const step = () => {
      const now = performance.now();
      times.push(now - last);
      last = now;
      if (now - t0 < 2200) requestAnimationFrame(step);
      else {
        times.shift();
        const avg = times.reduce((s, v) => s + v, 0) / times.length;
        resolve({ avg: +avg.toFixed(1), fps: Math.round(1000 / avg) });
      }
    };
    requestAnimationFrame(step);
  }));
  console.log(label, JSON.stringify(res));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  await run(browser, 'full          ', []);
  await run(browser, 'no-flow       ', ['flow.js']);
  await run(browser, 'no-hero       ', ['hero.js']);
  await run(browser, 'no-motion     ', ['motion.js']);
  await run(browser, 'no-flow+hero  ', ['flow.js', 'hero.js']);
  await browser.close();
})();
