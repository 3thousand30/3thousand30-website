const { chromium } = require('playwright-core');
const AxeBuilder = require('@axe-core/playwright').default;

const baseUrl = process.env.SITE_URL || 'http://127.0.0.1:4173';
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

async function visibleCatalogItems(page) {
  return page.locator('[data-catalog-item]:visible').count();
}

async function auditAccessibility(page, label) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  const blocking = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
  blocking.forEach((violation) => {
    failures.push(`${label} accessibility: ${violation.id} (${violation.nodes.length} nodes) — ${violation.help}`);
  });
}

(async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const requests = [];
  const pageErrors = [];
  page.on('request', (request) => requests.push(request.url()));
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await context.clearCookies();
  requests.length = 0;
  await page.reload({ waitUntil: 'networkidle' });

  assert(await page.locator('#cookie-banner').isVisible(), 'Consent banner is not visible before a choice.');
  assert(!requests.some((url) => /googletagmanager\.com\/gtag|google-analytics\.com\/g\/collect/.test(url)), 'Google Analytics requested data before consent.');
  assert(await page.locator('[data-menu-toggle]').isVisible(), 'Mobile menu button is not visible at 390px.');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'Homepage has horizontal overflow at 390px.');
  assert((await page.locator('body').textContent()).includes('12'), 'Homepage product count is missing.');
  assert((await page.locator('body').textContent()).includes('20'), 'Homepage use-case count is missing.');
  await auditAccessibility(page, 'Homepage');

  await page.locator('#cookie-accept').click();
  await page.waitForFunction(() => localStorage.getItem('cookie_consent') === 'granted');
  await page.waitForTimeout(1000);
  assert(await page.locator('#google-analytics-tag').count() === 1, 'Google Analytics script was not injected after acceptance.');
  assert(requests.some((url) => /googletagmanager\.com\/gtag/.test(url)), 'Google tag request was not observed after acceptance.');
  assert(requests.some((url) => /google-analytics\.com\/g\/collect/.test(url)), 'Google Analytics page-view collection was not observed after acceptance.');

  await page.goto(`${baseUrl}/products/`, { waitUntil: 'networkidle' });
  assert(await page.evaluate(() => localStorage.getItem('cookie_consent')) === 'granted', 'Analytics consent did not persist across navigation.');
  assert(await page.locator('#cookie-banner').count() === 0, 'Consent banner returned after acceptance.');
  let visibleCount = await visibleCatalogItems(page);
  assert(visibleCount === 12, `Product directory does not initially show 12 products (found ${visibleCount}).`);
  const productCardLicenses = await page.locator('[data-catalog-item] .card-license').allTextContents();
  assert(productCardLicenses.length === 12, `Product directory does not show a license label on every card (found ${productCardLicenses.length}).`);
  assert(productCardLicenses.every((label) => label.replace(/\s+/g, ' ').trim() === '// buy once'), 'Product cards do not use one consistent buy-once label.');
  const productCardCurrentPrices = await page.locator('[data-catalog-item] .card-price-values strong').allTextContents();
  const productCardOriginalPrices = await page.locator('[data-catalog-item] .card-price-values s').allTextContents();
  const productCardDiscounts = await page.locator('[data-catalog-item] .card-discount').allTextContents();
  assert(productCardCurrentPrices.length === 12, `Product directory does not show a current price on every card (found ${productCardCurrentPrices.length}).`);
  assert(productCardCurrentPrices.filter((price) => price.trim() === '$14.99').length === 3, 'Product directory does not show the $14.99 US price on all three AI apps.');
  assert(productCardCurrentPrices.filter((price) => price.trim() === '$3.74').length === 9, 'Product directory does not show the $3.74 US price on all nine other products.');
  assert(productCardOriginalPrices.filter((price) => price.trim() === '$19.99').length === 3, 'Product directory AI original prices are incorrect.');
  assert(productCardOriginalPrices.filter((price) => price.trim() === '$4.99').length === 9, 'Product directory standard original prices are incorrect.');
  assert(productCardDiscounts.every((discount) => discount.trim() === '-25%'), 'Product cards do not all show the current -25% Store discount.');
  assert(await page.locator('[data-catalog-item] .card-status', { hasText: 'released' }).count() === 0, 'Product cards still show the redundant released status.');
  assert(await page.locator('[data-catalog-controls]').evaluate((element) => getComputedStyle(element).position) !== 'sticky', 'Product filters cover the catalog on mobile.');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'Product directory has horizontal overflow at 390px.');
  await page.locator('[data-filter-group="categories"][data-filter-value="pdf"]').click();
  visibleCount = await visibleCatalogItems(page);
  assert(visibleCount === 3, `PDF filter does not show exactly BMP, BSP, and BTP (found ${visibleCount}).`);
  await page.locator('[data-filter-group="categories"][data-filter-value="all"]').click();
  await page.locator('[data-catalog-search]').fill('Key Rush');
  visibleCount = await visibleCatalogItems(page);
  assert(visibleCount === 1, `Product search does not isolate Key Rush (found ${visibleCount}).`);
  await page.locator('[data-menu-toggle]').click();
  assert(await page.locator('[data-mobile-menu]').isVisible(), 'Mobile navigation does not open.');
  assert(await page.locator('[data-menu-toggle]').getAttribute('aria-expanded') === 'true', 'Mobile navigation does not update aria-expanded.');
  await auditAccessibility(page, 'Product directory');

  await page.goto(`${baseUrl}/use-cases/`, { waitUntil: 'networkidle' });
  visibleCount = await visibleCatalogItems(page);
  assert(visibleCount === 20, `Use-case directory does not initially show 20 workflows (found ${visibleCount}).`);
  await page.locator('[data-filter-group="kind"][data-filter-value="files"]').click();
  visibleCount = await visibleCatalogItems(page);
  assert(visibleCount === 3, `PDF and file workflow filter does not show 3 workflows (found ${visibleCount}).`);
  await page.locator('[data-filter-group="kind"][data-filter-value="all"]').click();
  await page.locator('[data-catalog-search]').fill('copyright');
  visibleCount = await visibleCatalogItems(page);
  assert(visibleCount === 1, `Use-case search does not isolate the copyright workflow (found ${visibleCount}).`);
  await auditAccessibility(page, 'Use-case directory');

  await page.goto(`${baseUrl}/batch-text-to-pdf.html`, { waitUntil: 'networkidle' });
  const btpText = await page.locator('body').textContent();
  assert(btpText.includes('$3.74'), 'BTP current US price is missing.');
  assert(btpText.includes('$4.99'), 'BTP original US price is missing.');
  assert(btpText.includes('-25%'), 'BTP current Store discount is missing.');
  assert(!/6 August 2027|launch discount through/i.test(btpText), 'BTP contains an obsolete promotion end date.');
  assert(!/coming soon|certification|preparing for release/i.test(btpText), 'BTP contains pre-release wording.');
  assert(await page.locator(`a[href="https://apps.microsoft.com/detail/9NS1L0DK0FQL"]`).count() >= 1, 'BTP Store product-identity link is missing.');
  const firstBtpScreenshot = page.locator('img[src^="/screenshots/btp/"]').first();
  await firstBtpScreenshot.scrollIntoViewIfNeeded();
  await firstBtpScreenshot.waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const image = document.querySelector('img[src^="/screenshots/btp/"]');
    return image && image.complete && image.naturalWidth > 0;
  });
  assert(await firstBtpScreenshot.evaluate((image) => image.complete && image.naturalWidth > 0), 'BTP screenshot did not load.');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'BTP page has horizontal overflow at 390px.');
  await auditAccessibility(page, 'BTP product page');

  await page.goto(`${baseUrl}/use-cases/batch-create-pdfs-from-text.html`, { waitUntil: 'networkidle' });
  assert(await page.locator('h1').textContent() === 'Batch-Create PDFs From Text', 'BTP use-case heading is incorrect.');
  assert(await page.locator('a[href="/batch-text-to-pdf.html"]').count() >= 1, 'BTP use case does not link to the BTP page.');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'Use-case page has horizontal overflow at 390px.');
  await auditAccessibility(page, 'BTP use-case page');

  await page.goto(`${baseUrl}/privacy.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { document.cookie = '_ga_QATEST=value; path=/'; });
  await page.locator('[data-consent-deny]').click();
  await page.waitForFunction(() => localStorage.getItem('cookie_consent') === 'denied');
  const analyticsCookies = (await context.cookies()).filter((cookie) => /^(_ga|_gid|_gat)/.test(cookie.name));
  assert(analyticsCookies.length === 0, 'Analytics cookies remain after consent withdrawal.');
  requests.length = 0;
  await page.reload({ waitUntil: 'networkidle' });
  assert(!requests.some((url) => /googletagmanager\.com\/gtag|google-analytics\.com\/g\/collect/.test(url)), 'Analytics requested data after consent was denied and the page reloaded.');
  assert((await page.locator('[data-consent-status]').textContent()).trim() === 'declined', 'Privacy page does not show declined status.');
  await auditAccessibility(page, 'Privacy page');

  await page.setViewportSize({ width: 1365, height: 650 });
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  const desktopOpening = await page.evaluate(() => {
    const consolePanel = document.querySelector('.home-console');
    return {
      panelBottom: consolePanel?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY,
      viewportHeight: window.innerHeight,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });
  assert(desktopOpening.panelBottom <= desktopOpening.viewportHeight, `Homepage opening console is clipped at 1365x650 (bottom ${desktopOpening.panelBottom}px).`);
  assert(!desktopOpening.overflowX, 'Homepage has horizontal overflow at 1365px.');

  assert(pageErrors.length === 0, `Browser page errors: ${pageErrors.join(' | ')}`);
  await browser.close();

  if (failures.length) {
    console.error(`Browser checks failed (${failures.length}):`);
    failures.forEach((message) => console.error(`- ${message}`));
    process.exit(1);
  }

  console.log('Browser checks passed: mobile layout, filters, navigation, product pricing, assets, and analytics consent lifecycle.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
