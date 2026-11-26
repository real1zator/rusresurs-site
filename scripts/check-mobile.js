const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });

  const res = {};
  const base = 'http://127.0.0.1:4321/';

  for (const [file, expected] of [
    ['personnel.html', 'Услуги'],
    ['outsourcing.html', 'Услуги'],
    ['prices.html', 'Расчёт'],
    ['vacancies.html', 'Вакансии'],
    ['contacts.html', 'Контакты'],
    ['index.html', 'Главная'],
  ]) {
    await page.goto(base + file, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(250);
    const label = await page.evaluate(() => {
      const el = document.querySelector('.tabbar__item[aria-current]');
      return el ? el.textContent.trim() : null;
    });
    res['tab:' + file] = label === expected ? 'ok' : 'FAIL(' + label + ')';
  }

  await page.goto(base + 'index.html', { waitUntil: 'networkidle' });
  await page.locator('.tabbar .tabbar__item--cta').click();
  await page.waitForTimeout(1000);
  res.tapNav = page.url().includes('prices.html') ? 'ok' : 'FAIL(' + page.url() + ')';

  await page.selectOption('select[name="profession"]', 'Сварщик');
  await page.waitForTimeout(300);
  res.calc = /\d/.test(await page.locator('[data-calc-total]').innerText()) ? 'ok' : 'FAIL';

  await page.goto(base + 'personnel.html', { waitUntil: 'networkidle' });
  await page.locator('[data-filter="stroyka"]').click();
  await page.waitForTimeout(300);
  res.filter = (await page.locator('.prof-card:not([hidden])').count()) === 4 ? 'ok' : 'FAIL';

  await page.locator('.prof-card:not([hidden]) [data-order]').first().click();
  await page.waitForTimeout(600);
  res.modal = (await page.locator('#order-modal').evaluate((d) => d.open === true)) ? 'ok' : 'FAIL';
  await page.screenshot({ path: path.join('D:\\PROJCT\\сайты\\rusresurs\\preview', 'v3-modal.png') });
  await page.locator('#order-modal [data-close]').click();
  await page.waitForTimeout(300);
  res.modalClosed = (await page.locator('#order-modal').evaluate((d) => d.open === false)) ? 'ok' : 'FAIL';

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
  await page.waitForTimeout(500);
  res.progress = (await page.evaluate(() => parseFloat(document.querySelector('[data-progress]').style.width))) > 20 ? 'ok' : 'FAIL';
  res.tabSticky = (await page.locator('.tabbar').isVisible()) ? 'ok' : 'FAIL';

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join('D:\\PROJCT\\сайты\\rusresurs\\preview', 'v3-mobile-hero.png') });

  console.log(JSON.stringify(res, null, 1));
  console.log('errors', errors);
  await browser.close();
  process.exit(Object.values(res).some((v) => v !== 'ok') || errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
