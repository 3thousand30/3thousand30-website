module.exports = function (eleventyConfig) {
  eleventyConfig.addFilter('json', function (value) {
    return JSON.stringify(value).replace(/</g, '\\u003c');
  });

  eleventyConfig.addFilter('readableList', function (items) {
    if (!Array.isArray(items)) return '';
    return new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(items);
  });

  eleventyConfig.addFilter('filterByCodes', function (products, codes) {
    if (!Array.isArray(products) || !Array.isArray(codes)) return [];
    return codes.map((code) => products.find((product) => product.code === code)).filter(Boolean);
  });

  eleventyConfig.addFilter('filterBySlugs', function (items, slugs) {
    if (!Array.isArray(items) || !Array.isArray(slugs)) return [];
    return slugs.map((slug) => items.find((item) => item.slug === slug)).filter(Boolean);
  });

  eleventyConfig.addTransform('trimTrailingWhitespace', function (content) {
    if (!this.page.outputPath || !/\.(?:html|xml|txt)$/.test(this.page.outputPath)) return content;
    return content.replace(/[ \t]+$/gm, '');
  });

  eleventyConfig.addWatchTarget('./tailwind.input.css');

  return {
    dir: {
      input: '_src',
      includes: '_includes',
      data: '_data',
      output: '.'
    },
    templateFormats: ['njk'],
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk'
  };
};
