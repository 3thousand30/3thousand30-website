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
  assert((await page.locator('body').textContent()).includes('15'), 'Homepage product count is missing.');
  assert((await page.locator('.home-console-footer').textContent()).replace(/\s+/g, ' ').includes('35 practical workflows'), 'Homepage use-case count is missing.');
  assert(await page.locator('a[href="/use-cases/compress-pdfs-without-uploading-them.html"]').count() >= 1, 'Homepage does not feature the private PDF compression workflow.');
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
  assert(visibleCount === 15, `Product directory does not initially show 15 products (found ${visibleCount}).`);
  const productCardLicenses = await page.locator('[data-catalog-item] .card-license').allTextContents();
  assert(productCardLicenses.length === 15, `Product directory does not show a license label on every card (found ${productCardLicenses.length}).`);
  assert(productCardLicenses.every((label) => label.replace(/\s+/g, ' ').trim() === '// buy once'), 'Product cards do not use one consistent buy-once label.');
  const productCardCurrentPrices = await page.locator('[data-catalog-item] .card-price-values strong').allTextContents();
  const productCardOriginalPrices = await page.locator('[data-catalog-item] .card-price-values s').allTextContents();
  const productCardDiscounts = await page.locator('[data-catalog-item] .card-discount').allTextContents();
  assert(productCardCurrentPrices.length === 15, `Product directory does not show a current price on every card (found ${productCardCurrentPrices.length}).`);
  assert(productCardCurrentPrices.filter((price) => price.trim() === '$14.99').length === 3, 'Product directory does not show the $14.99 US price on all three AI apps.');
  assert(productCardCurrentPrices.filter((price) => price.trim() === '$3.74').length === 9, 'Product directory does not show the $3.74 US price on all nine other products.');
  assert(productCardCurrentPrices.filter((price) => price.trim() === '$4.99').length === 3, 'Product directory does not show the $4.99 recommended base price on all three PDF release candidates.');
  assert(productCardOriginalPrices.filter((price) => price.trim() === '$19.99').length === 3, 'Product directory AI original prices are incorrect.');
  assert(productCardOriginalPrices.filter((price) => price.trim() === '$4.99').length === 9, 'Product directory standard original prices are incorrect.');
  assert(productCardDiscounts.length === 12 && productCardDiscounts.every((discount) => discount.trim() === '-25%'), 'Discounted product cards do not consistently show the current -25% Store discount.');
  assert(await page.locator('[data-catalog-item] .card-status', { hasText: 'released' }).count() === 0, 'Product cards still show the redundant released status.');
  assert(await page.locator('[data-catalog-controls]').evaluate((element) => getComputedStyle(element).position) !== 'sticky', 'Product filters cover the catalog on mobile.');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'Product directory has horizontal overflow at 390px.');
  await page.locator('[data-filter-group="categories"][data-filter-value="pdf"]').click();
  visibleCount = await visibleCatalogItems(page);
  assert(visibleCount === 6, `PDF filter does not show BMP, BSP, BTP, BCP, BWP, and BPP (found ${visibleCount}).`);
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
  assert(visibleCount === 35, `Use-case directory does not initially show 35 workflows (found ${visibleCount}).`);
  assert((await page.locator('[data-catalog-item] h3').first().textContent()).trim() === 'Compress PDFs Without Uploading Them', 'Use-case directory does not prioritize the new private PDF workflow.');
  await page.locator('[data-filter-group="kind"][data-filter-value="files"]').click();
  visibleCount = await visibleCatalogItems(page);
  assert(visibleCount === 12, `PDF and file workflow filter does not show 12 workflows (found ${visibleCount}).`);
  await page.locator('[data-filter-group="kind"][data-filter-value="all"]').click();
  await page.locator('[data-filter-group="categories"][data-filter-value="pdf-tools"]').click();
  visibleCount = await visibleCatalogItems(page);
  assert(visibleCount === 17, `PDF tools filter does not show 17 workflows (found ${visibleCount}).`);
  await page.locator('[data-filter-group="categories"][data-filter-value="bt"]').click();
  visibleCount = await visibleCatalogItems(page);
  assert(visibleCount === 3, `Translation filter does not show 3 workflows (found ${visibleCount}).`);
  await page.locator('[data-filter-group="categories"][data-filter-value="all"]').click();
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
  const btpSchema = await page.locator('script[type="application/ld+json"]').first().evaluate((script) => JSON.parse(script.textContent));
  const btpSchemaNodes = btpSchema['@graph'] || [];
  const btpSoftware = btpSchemaNodes.find((node) => node['@type'] === 'SoftwareApplication');
  const btpWebPage = btpSchemaNodes.find((node) => node['@type'] === 'WebPage');
  assert(btpSoftware?.offers?.price === '3.74' && btpSoftware?.offers?.priceCurrency === 'USD', 'BTP SoftwareApplication Offer is incomplete.');
  assert(btpSoftware?.installUrl === 'https://apps.microsoft.com/detail/9NS1L0DK0FQL', 'BTP SoftwareApplication Store identity is incomplete.');
  assert(Array.isArray(btpSoftware?.screenshot) && btpSoftware.screenshot.length === 6, 'BTP SoftwareApplication screenshots are missing.');
  assert(btpWebPage?.mainEntity?.['@id'] === btpSoftware?.['@id'], 'BTP WebPage and SoftwareApplication entities are not linked.');
  assert(!btpSoftware?.aggregateRating && !btpSoftware?.review, 'BTP schema contains an unsupported rating or review.');
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

  await page.goto(`${baseUrl}/use-cases/convert-markdown-files-to-pdf-in-bulk.html`, { waitUntil: 'networkidle' });
  assert(await page.locator('h1').textContent() === 'Convert Markdown Files to PDF in Bulk', 'New Markdown-to-PDF use-case heading is incorrect.');
  assert(await page.title() === 'How to Convert Markdown Files to PDF in Bulk on Windows | 3thousand30', 'New Markdown-to-PDF page title is incorrect.');
  assert(await page.locator('a[href="/batch-text-to-pdf.html"]').count() >= 1, 'New Markdown-to-PDF use case does not link to BTP.');
  assert(await page.locator('#workflow li').count() === 6, 'New Markdown-to-PDF use case does not contain its complete workflow.');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'New Markdown-to-PDF page has horizontal overflow at 390px.');
  await auditAccessibility(page, 'New Markdown-to-PDF use case');

  const pdfReleaseCandidates = [
    { code: 'BCP', slug: 'batch-compress-pdf', name: 'Batch Compress PDF', storeId: '9NNPJR6NP2S3', identity: '3thousand30.BatchCompressPDFs', screenshotFolder: 'bcp' },
    { code: 'BWP', slug: 'batch-watermark-pdfs', name: 'Batch Watermark PDFs', storeId: '9N5C4HHWCR6R', identity: '3thousand30.BatchWatermarkPDFs', screenshotFolder: 'bwp' },
    { code: 'BPP', slug: 'batch-protect-pdfs', name: 'Batch Protect PDFs', storeId: '9N16J4D2MDM1', identity: '3thousand30.BatchProtectPDFs', screenshotFolder: 'bpp' }
  ];
  for (const product of pdfReleaseCandidates) {
    await page.goto(`${baseUrl}/${product.slug}.html`, { waitUntil: 'networkidle' });
    const body = await page.locator('body').textContent();
    assert(await page.locator('h1').textContent() === product.name, `${product.code} product heading is incorrect.`);
    assert(body.includes('$4.99') && !body.includes('-0%'), `${product.code} recommended price presentation is incorrect.`);
    assert(await page.locator(`a[href="https://apps.microsoft.com/detail/${product.storeId}"]`).count() >= 1, `${product.code} Store ID link is missing.`);
    assert(body.includes('release candidate'), `${product.code} release-candidate disclosure is missing from the local page.`);
    const schema = await page.locator('script[type="application/ld+json"]').first().evaluate((script) => JSON.parse(script.textContent));
    const software = (schema['@graph'] || []).find((node) => node['@type'] === 'SoftwareApplication');
    assert(software?.installUrl === `https://apps.microsoft.com/detail/${product.storeId}`, `${product.code} schema Store identity is incorrect.`);
    assert(software?.offers?.price === '4.99', `${product.code} schema recommended price is incorrect.`);
    assert(Array.isArray(software?.screenshot) && software.screenshot.length === 6, `${product.code} schema screenshots are incomplete.`);
    const firstScreenshot = page.locator(`img[src^="/screenshots/${product.screenshotFolder}/"]`).first();
    await firstScreenshot.scrollIntoViewIfNeeded();
    await page.waitForFunction((folder) => { const image = document.querySelector(`img[src^="/screenshots/${folder}/"]`); return image && image.complete && image.naturalWidth > 0; }, product.screenshotFolder);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${product.code} page has horizontal overflow at 390px.`);
    await auditAccessibility(page, `${product.code} product page`);
  }

  const newPdfWorkflows = [
    ['compress-pdfs-without-uploading-them', 'Compress PDFs Without Uploading Them', '/batch-compress-pdf.html'],
    ['reduce-scanned-pdfs-for-email-and-archiving', 'Reduce Scanned PDFs for Email and Archiving', '/batch-compress-pdf.html'],
    ['add-watermarks-to-pdf-documents-in-batches', 'Add Watermarks to PDF Documents in Batches', '/batch-watermark-pdfs.html'],
    ['watermark-client-pdf-proofs-before-sharing', 'Watermark Client PDF Proofs Before Sharing', '/batch-watermark-pdfs.html'],
    ['protect-pdf-deliverables-with-passwords', 'Protect PDF Deliverables With Passwords', '/batch-protect-pdfs.html']
  ];
  for (const [slug, title, productUrl] of newPdfWorkflows) {
    await page.goto(`${baseUrl}/use-cases/${slug}.html`, { waitUntil: 'networkidle' });
    assert(await page.locator('h1').textContent() === title, `${slug} heading is incorrect.`);
    assert(await page.locator(`a[href="${productUrl}"]`).count() >= 1, `${slug} does not link back to its product.`);
    assert(await page.locator('#workflow li').count() === 6, `${slug} does not contain its complete six-step workflow.`);
    assert(await page.locator('.faq-item').count() >= 2, `${slug} FAQ is incomplete.`);
    assert(await page.locator('script[type="application/ld+json"]').count() >= 1, `${slug} structured data is missing.`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${slug} has horizontal overflow at 390px.`);
    await auditAccessibility(page, `${slug} use-case page`);
  }

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

  console.log('Browser checks passed: mobile layout, 35-workflow catalog, 15-product pricing and schema, assets, and analytics consent lifecycle.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
