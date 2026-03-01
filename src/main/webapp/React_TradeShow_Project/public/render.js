const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setViewport({ width: 400, height: 400 });
  await page.goto('file://' + __dirname + '/index.html');

  for (let i = 0; i < 240; i++) {
    await page.screenshot({
      path: `frames/frame_${String(i).padStart(4, '0')}.png`,
      omitBackground: true
    });
    await page.waitForTimeout(16);
  }

  await browser.close();
})();