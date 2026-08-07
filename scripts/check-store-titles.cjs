const products = require('../_src/_data/products.js');

const publisherCatalogUrl = new URL('https://apps.microsoft.com/api/Products/SearchByPublisherName');
publisherCatalogUrl.search = new URLSearchParams({
  publisherName: '3thousand30',
  gl: 'DE',
  hl: 'en-US',
  exp: '0'
}).toString();

function storeIdFromUrl(storeUrl) {
  return new URL(storeUrl).pathname.split('/').filter(Boolean).pop().toUpperCase();
}

(async () => {
  const response = await fetch(publisherCatalogUrl, {
    headers: {
      Accept: 'application/json',
      Referer: 'https://apps.microsoft.com/',
      'User-Agent': '3thousand30-website-title-check/1.0'
    }
  });
  if (!response.ok) throw new Error(`Microsoft Store catalog returned HTTP ${response.status}.`);

  const catalog = await response.json();
  const storeProducts = catalog.productsList || [];
  const localById = new Map(products.map((product) => [storeIdFromUrl(product.storeUrl), product]));
  const storeById = new Map(storeProducts.map((product) => [product.productId.toUpperCase(), product]));
  const failures = [];

  for (const [storeId, product] of localById) {
    const storeProduct = storeById.get(storeId);
    if (!storeProduct) {
      failures.push(`${product.code}: Store product ${storeId} is missing from the 3thousand30 publisher catalog.`);
      continue;
    }
    if (product.name !== storeProduct.title) {
      failures.push(`${product.code}: website uses "${product.name}"; Microsoft Store uses "${storeProduct.title}".`);
    }
  }

  for (const [storeId, storeProduct] of storeById) {
    if (!localById.has(storeId)) failures.push(`Microsoft Store product ${storeId} (${storeProduct.title}) is missing from the website.`);
  }

  if (failures.length) {
    console.error(`Microsoft Store title checks failed (${failures.length}):`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log(`Microsoft Store title checks passed: ${products.length} website products exactly match the publisher catalog.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
