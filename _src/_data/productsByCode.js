const products = require('./products');

module.exports = products.reduce((index, product) => {
  index[product.code] = product;
  return index;
}, {});
