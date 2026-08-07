const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const products = require(path.join(root, '_src', '_data', 'products.js'));
const useCases = require(path.join(root, '_src', '_data', 'useCases.js'));
const failures = [];

// Canonical display names from the Microsoft Store publisher catalog.
const officialStoreTitles = new Map([
  ['9N75DWR9X2S7', 'Batch Translate Text with any AI'],
  ['9N3S7ZRPXGPH', 'Batch Watermark Image'],
  ['9N1DBC2G87HT', 'Batch Compress Image'],
  ['9PPKDVXPTLV0', 'Batch Resize Image'],
  ['9N2VHG38SS00', 'Batch Enhance Image'],
  ['9PB3Q7K9FVZQ', 'Batch File Organiser'],
  ['9N3B1B8DT39F', 'Batch Generate Text with any AI'],
  ['9PFR4V6827XQ', 'Batch Generate Image with any AI'],
  ['9NVDT0TTN0WH', 'Batch Merge PDFs'],
  ['9MZKRHK6NRRS', 'Batch Split PDFs'],
  ['9NS1L0DK0FQL', 'Batch Text to PDF'],
  ['9MW7722B1026', 'Key Rush']
]);

function fail(message) {
  failures.push(message);
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '_src') return [];
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function routeForFile(file) {
  const relative = path.relative(root, file).replace(/\\/g, '/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'index.html'.length)}`;
  return `/${relative}`;
}

function localTargetExists(url, sourceFile) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.split('#')[0].split('?')[0]);
  } catch {
    pathname = url.split('#')[0].split('?')[0];
  }
  if (!pathname) return true;

  const candidate = pathname.startsWith('/')
    ? path.join(root, pathname.slice(1))
    : path.resolve(path.dirname(sourceFile), pathname);
  const resolved = pathname.endsWith('/') ? path.join(candidate, 'index.html') : candidate;
  return fs.existsSync(resolved);
}

for (const product of products) {
  const storeId = product.storeUrl.split('/').pop().split('?')[0].toUpperCase();
  const officialTitle = officialStoreTitles.get(storeId);
  if (!officialTitle) {
    fail(`${product.code}: Microsoft Store ID ${storeId} is missing from the canonical title map.`);
    continue;
  }
  if (product.name !== officialTitle) fail(`${product.code}: product name must be "${officialTitle}", found "${product.name}".`);
  if (product.shortName !== officialTitle) fail(`${product.code}: short name must preserve the exact Store title "${officialTitle}".`);
  if (!product.seoTitle.startsWith(`${officialTitle} — `)) fail(`${product.code}: SEO title must begin with the exact Store title.`);
  if (!/^\d+\.\d{2}$/.test(product.price?.current)) fail(`${product.code}: current US price is missing or malformed.`);
  if (!/^\d+\.\d{2}$/.test(product.price?.original)) fail(`${product.code}: original US price is missing or malformed.`);
  if (product.price?.discountPercent !== 25) fail(`${product.code}: expected a 25% Store discount.`);
  if (product.price?.currency !== 'USD' || product.price?.region !== 'US') fail(`${product.code}: price must identify the US Store and USD.`);

  const generatedProductPage = path.join(root, product.url.slice(1));
  if (fs.existsSync(generatedProductPage)) {
    const productHtml = fs.readFileSync(generatedProductPage, 'utf8');
    if (!productHtml.includes(`<title>${product.seoTitle}</title>`)) fail(`${product.code}: generated page title does not match product SEO title.`);
    if (!productHtml.includes(`>${officialTitle}</h1>`)) fail(`${product.code}: generated h1 does not use the exact Store title.`);
    if (!productHtml.includes(`$${product.price.current}`)) fail(`${product.code}: generated page is missing the current US price.`);
    if (!productHtml.includes(`$${product.price.original}`)) fail(`${product.code}: generated page is missing the original US price.`);
    if (!productHtml.includes(`-${product.price.discountPercent}%`)) fail(`${product.code}: generated page is missing the Store discount.`);
    if (!productHtml.includes(`"priceCurrency": "${product.price.currency}"`)) fail(`${product.code}: generated SoftwareApplication offer is missing its price currency.`);
    if (/priceValidUntil/i.test(productHtml)) fail(`${product.code}: generated price offer must not publish an end date.`);
  }
}
if (officialStoreTitles.size !== products.length) {
  fail(`Canonical Store title map has ${officialStoreTitles.size} entries for ${products.length} products.`);
}

const htmlFiles = walk(root).filter((file) => file.endsWith('.html'));
const expectedHtmlCount = 1 + 2 + products.length + useCases.length + 3;
if (htmlFiles.length !== expectedHtmlCount) {
  fail(`Expected ${expectedHtmlCount} generated HTML files, found ${htmlFiles.length}.`);
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const relative = path.relative(root, file).replace(/\\/g, '/');
  const expectedCanonical = `https://3thousand30.com${routeForFile(file)}`;

  if (!/<html\s+lang="en"/.test(html)) fail(`${relative}: missing html lang.`);
  if (!/<meta\s+name="viewport"/.test(html)) fail(`${relative}: missing viewport.`);
  if (!/<meta\s+name="description"\s+content="[^"]+"/.test(html)) fail(`${relative}: missing description.`);
  if (!new RegExp(`<link rel="canonical" href="${expectedCanonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(html)) {
    fail(`${relative}: canonical does not match ${expectedCanonical}.`);
  }
  const h1Count = (html.match(/<h1\b/g) || []).length;
  if (h1Count !== 1) fail(`${relative}: expected one h1, found ${h1Count}.`);
  if (!html.includes('<script src="/site.js"></script>')) fail(`${relative}: site.js missing.`);
  if (!html.includes('<script src="/cookie-banner.js"></script>')) fail(`${relative}: analytics consent script missing.`);
  if (/googletagmanager\.com\/gtag\/js/i.test(html)) fail(`${relative}: Google tag embedded before consent.`);
  if (/max-h-\[72vh\]|overflow-y-auto[^"\n]*scrollbar-hide|auto-expand/i.test(html)) fail(`${relative}: legacy nested-scroll or auto-expand architecture found.`);

  const ids = Array.from(html.matchAll(/\sid="([^"]+)"/g), (match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length) fail(`${relative}: duplicate IDs ${Array.from(new Set(duplicateIds)).join(', ')}.`);

  for (const match of html.matchAll(/<img\b([^>]+)>/g)) {
    if (!/\salt="[^"]*"/.test(match[1])) fail(`${relative}: image without alt attribute.`);
  }

  for (const match of html.matchAll(/<(?:a|link|script|img)\b[^>]*\s(?:href|src)="([^"]+)"/g)) {
    const url = match[1];
    if (/^(?:https?:|mailto:|tel:|data:|javascript:|#)/i.test(url)) continue;
    if (!localTargetExists(url, file)) fail(`${relative}: missing local target ${url}.`);
  }

  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      fail(`${relative}: invalid JSON-LD (${error.message}).`);
    }
  }
}

const sitemapPath = path.join(root, 'sitemap.xml');
const sitemap = fs.readFileSync(sitemapPath, 'utf8');
const sitemapUrls = Array.from(sitemap.matchAll(/<loc>(.*?)<\/loc>/g), (match) => match[1]);
const expectedSitemapUrls = [
  'https://3thousand30.com/',
  'https://3thousand30.com/products/',
  'https://3thousand30.com/use-cases/',
  'https://3thousand30.com/manifesto.html',
  'https://3thousand30.com/privacy.html',
  ...products.map((product) => `https://3thousand30.com${product.url}`),
  ...useCases.map((useCase) => `https://3thousand30.com${useCase.url}`)
];

for (const url of expectedSitemapUrls) {
  if (!sitemapUrls.includes(url)) fail(`sitemap.xml: missing ${url}.`);
}
for (const product of products) {
  const expectedEntry = `<loc>https://3thousand30.com${product.url}</loc>`;
  const entryStart = sitemap.indexOf(expectedEntry);
  const entryEnd = sitemap.indexOf('</url>', entryStart);
  const entry = entryStart >= 0 && entryEnd >= 0 ? sitemap.slice(entryStart, entryEnd) : '';
  if (!entry.includes(`<lastmod>${product.lastmod}</lastmod>`)) fail(`sitemap.xml: ${product.code} lastmod does not match ${product.lastmod}.`);
}
if (sitemapUrls.length !== expectedSitemapUrls.length) {
  fail(`sitemap.xml: expected ${expectedSitemapUrls.length} URLs, found ${sitemapUrls.length}.`);
}
if (sitemapUrls.includes('https://3thousand30.com/404.html')) fail('sitemap.xml: 404 page must not be included.');

const btp = fs.readFileSync(path.join(root, 'batch-text-to-pdf.html'), 'utf8');
for (const required of ['9NS1L0DK0FQL', '$3.74', '$4.99', '-25%', 'USD price shown']) {
  if (!btp.includes(required)) fail(`BTP page: missing required text ${required}.`);
}
if (/coming soon|certification|preparing for release/i.test(btp)) {
  fail('BTP page: contains forbidden pre-release wording.');
}
if (/launch discount through|6 August 2027/i.test(btp)) fail('BTP page: contains an obsolete promotion end date.');

const productCards = fs.readFileSync(path.join(root, '_src', '_includes', 'components', 'cards.njk'), 'utf8');
if (productCards.includes('item.priceLabel')) fail('Product cards: legacy priceLabel presentation remains.');
if (/card-status[^\n]*released|>released</i.test(productCards)) fail('Product cards: redundant released status remains.');
if (!productCards.includes('item.price.current') || !productCards.includes('item.price.discountPercent')) fail('Product cards: current Store pricing is missing.');
if (!productCards.includes('<span class="card-license"><i>//</i> buy once</span>')) {
  fail('Product cards: shared buy-once label is missing.');
}

const analytics = fs.readFileSync(path.join(root, 'cookie-banner.js'), 'utf8');
for (const required of [
  "MEASUREMENT_ID = 'G-8N64KW0ELL'",
  "readConsent() !== 'granted'",
  "script.src = 'https://www.googletagmanager.com/gtag/js?id='",
  "window.gtag('config', MEASUREMENT_ID",
  "window.gtag('consent', 'update'",
  'deleteAnalyticsCookies()',
  "sendAnalyticsEvent('store_click'"
]) {
  if (!analytics.includes(required)) fail(`cookie-banner.js: missing analytics safeguard ${required}.`);
}

if (failures.length) {
  console.error(`Site checks failed (${failures.length}):`);
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`Site checks passed: ${htmlFiles.length} HTML pages, ${products.length} products, ${useCases.length} use cases, ${sitemapUrls.length} sitemap URLs.`);
