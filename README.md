# 3thousand30 website

Public marketing website for [3thousand30.com](https://3thousand30.com).

The site uses Eleventy to generate committed static HTML into the repository root. GitHub Pages continues to publish that root, so deployment does not depend on a separate server or runtime.

## Local commands

```bash
npm install
npm run build
npm run check
npm run serve
```

- `npm run build` compiles Tailwind and regenerates every public page, `robots.txt`, and `sitemap.xml`.
- `npm run check` validates output count, canonical URLs, local links/assets, JSON-LD, sitemap coverage, analytics safeguards, and required BTP release details.
- `npm run serve` builds and starts Eleventy’s local development server.

## Content architecture

- `_src/_data/products.js` is the canonical product catalog.
- `_src/_data/useCases.js` is the canonical use-case library.
- `_src/_includes/` contains shared layouts and components.
- `_src/product.njk` generates every dedicated product page.
- `_src/use-case.njk` generates every dedicated use-case page.
- `_src/sitemap.njk` generates the sitemap from the same public data.
- `site.js` provides accessible navigation, catalog filtering, consent controls, and reduced-motion-aware reveal enhancement.
- `cookie-banner.js` owns consent-gated Google Analytics loading and interaction events.

Existing public product and use-case URLs are preserved. New content should be added to the data files, built, checked, and committed together with the generated root output.
