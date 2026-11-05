const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    if (process.env.MOODS_TEST_TRACK) {
      await page.route('**/releases/download/moods-audio-v1/*.mp3', route => route.fulfill({ path: process.env.MOODS_TEST_TRACK, contentType: 'audio/mpeg' }));
    }
    await page.goto('http://127.0.0.1:4173/showcase/moods/');
    assert.equal(await page.locator('[data-track-url]').count(), 27);
    assert.equal(await page.locator('[data-track-download]').count(), 27);
    assert.equal(await page.locator('section[aria-labelledby^="mood-"]').count(), 9);
    await page.locator('[data-track-url]').first().click();
    await page.waitForFunction(() => document.querySelector('[data-audio]').currentTime > 0, null, { timeout: 20000 });
    assert.equal(await page.locator('[data-now-playing]').textContent(), 'Love - Joyful Beginnings');
    await page.locator('[data-track-url]').nth(1).click();
    await page.waitForFunction(() => document.querySelector('[data-now-playing]').textContent === 'Love - Tender Reverie');
    await page.locator('[data-track-url]').nth(1).click();
    assert.equal(await page.locator('[data-audio]').evaluate(audio => audio.paused), true);
    if (!process.env.MOODS_TEST_TRACK) {
      const pendingDownload = page.waitForEvent('download');
      await page.locator('[data-track-download]').first().click();
      const download = await pendingDownload;
      assert.equal(download.suggestedFilename(), 'moods-01.mp3');
      assert.equal(await download.failure(), null);
    }
    await page.evaluate(() => window.scrollTo(0, 1000));
    const top = await page.locator('[data-moods-player]').evaluate(el => Math.round(el.getBoundingClientRect().top));
    assert.equal(top, 64);
    await page.goto('http://127.0.0.1:4173/works/?focus=people-places-perspective');
    await page.waitForURL('**/showcase/?focus=people-places-perspective');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://127.0.0.1:4173/showcase/moods/');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    console.log('Moods browser checks passed: playback, switching, pause, sticky player, legacy redirect and mobile width.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
