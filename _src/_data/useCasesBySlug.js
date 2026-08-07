const useCases = require('./useCases');

module.exports = useCases.reduce((index, useCase) => {
  index[useCase.slug] = useCase;
  return index;
}, {});
