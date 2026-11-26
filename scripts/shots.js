const { chromium } = require('playwright');
const path = require('path');
const OUT = 'D:\\PROJCT\\сайты\\rusresurs\\preview';

async function settle(page) {
  await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const step = Math.round(window.innerHeight * 0.7);
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 70));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 250));
  });
  await page.evaluate(() => Promise.all(Array.from(document.images).map((img) => {
    if (img.complete) return true;
    return new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); });
  })));
  await page.waitForTimeout(1600);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mp = await m.newPage();
  await mp.goto('http://127.0.0.1:4321/index.html', { waitUntil: 'networkidle' });
  await settle(mp);
  await mp.screenshot({ path: path.join(OUT, 'v3-m-home-hero.png') });
  await mp.evaluate(() => window.scrollTo(0, 700));
  await mp.waitForTimeout(700);
  await mp.screenshot({ path: path.join(OUT, 'v3-m-home-2.png') });
  await mp.evaluate(() => window.scrollTo(0, 1600));
  await mp.waitForTimeout(700);
  await mp.screenshot({ path: path.join(OUT, 'v3-m-home-3.png') });

  const d = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dp = await d.newPage();
  await dp.goto('http://127.0.0.1:4321/index.html', { waitUntil: 'networkidle' });
  await settle(dp);
  await dp.screenshot({ path: path.join(OUT, 'v3-d-home-hero.png') });
  await dp.evaluate(() => window.scrollTo(0, 1000));
  await dp.waitForTimeout(700);
  await dp.screenshot({ path: path.join(OUT, 'v3-d-home-2.png') });
  await dp.evaluate(() => window.scrollTo(0, 2400));
  await dp.waitForTimeout(700);
  await dp.screenshot({ path: path.join(OUT, 'v3-d-home-3.png') });

  await browser.close();
  console.log('done');
})();
