const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle0' }).catch(console.error);
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' }).catch(console.error);
  await browser.close();
})();
