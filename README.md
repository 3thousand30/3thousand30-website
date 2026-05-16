# 3thousand30 Website

Marketing site for **3thousand30** — buy-once, privacy-first Windows tools.

🔗 Live: [3thousand30.com](https://3thousand30.com)

## Stack

Plain static HTML, no build step. Tailwind is loaded via the
[Tailwind CDN](https://cdn.tailwindcss.com) with an inline `tailwind.config`
in each page's `<head>`. Hosted on GitHub Pages.

**Workflow:** edit HTML → commit → push → live. No npm, no build, no dependencies.

## Structure

| Path | Purpose |
|------|---------|
| `index.html` | Home — products, platform, artifacts, free tools |
| `batch*.html` | One detail page per paid app |
| `manifesto.html` / `privacy.html` | Manifesto & privacy policy |
| `cookie-banner.js` | Consent banner (Google Analytics opt-in) |
| `Logos/`, `screenshots/` | Image assets |
| `sitemap.xml`, `robots.txt`, `CNAME` | SEO / hosting config |

## Products

| App | Detail page | Price (USD) |
|-----|-------------|-------------|
| BatchGen Text with AI | `batchgen-text.html` | $14.99 |
| BatchGen Image with AI | `batchgen-image.html` | ~~$19.99~~ **$13.99** (sale, ends 2026-06-09) |
| BatchEnhance Image | `batchenhance-image.html` | $4.99 |
| BatchFile Organiser | `batchfile-organiser.html` | $9.99 |
| BatchWatermark Image | `batchwatermark-image.html` | $4.99 |
| BatchCompress Image | `batchcompress-image.html` | $2.99 |
| BatchResize Image | `batchresize-image.html` | $2.99 |

Prices appear in three places per product: the home card, the detail-page
header box, and the `other_apps` carousel on every other detail page. Microsoft
Store prices vary by region — the values above are the US prices.

## Maintenance notes

- **Changing a price:** update it on the home card, that app's detail page
  (header box + in-button price), and the `other_apps` mini-card on the other
  six detail pages.
- **Discounts:** sale price first, then struck original, then `-30%`, then a
  dated "limited-time" label. Keep the visible end date and the JSON-LD
  `priceValidUntil` in sync.
- **SEO:** each page has its own `<title>`, meta description, canonical, Open
  Graph/Twitter tags, and `SoftwareApplication` JSON-LD. Bump `lastmod` in
  `sitemap.xml` when content changes.
