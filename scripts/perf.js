const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  // эмулируем средний телефон: 4x замедление CPU
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('http://127.0.0.1:4321/index.html', { waitUntil: 'networkidle' });

  const measure = async (label, scroll) => {
    if (scroll) await page.evaluate(() => window.scrollBy(0, 10));
    const r = await page.evaluate(() => new Promise((resolve) => {
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
          const sorted = [...times].sort((a, b) => a - b);
          const avg = times.reduce((s, v) => s + v, 0) / times.length;
          resolve({
            frames: times.length,
            avg: +avg.toFixed(1),
            p95: +sorted[Math.floor(sorted.length * 0.95)].toFixed(1),
            max: +sorted[sorted.length - 1].toFixed(1),
            fps: Math.round(1000 / avg),
            long: times.filter((t) => t > 40).length,
          });
        }
      };
      requestAnimationFrame(step);
    }));
    console.log(label, JSON.stringify(r));
    return r;
  };

  await page.waitForTimeout(2600); // интро закончилось
  await measure('idle           ');
  await page.evaluate(() => { window.__loop = setInterval(() => window.scrollBy(0, 12), 16); });
  await measure('scrolling      ');
  await page.evaluate(() => clearInterval(window.__loop));

  console.log('errors', errors);
  await browser.close();
})();
