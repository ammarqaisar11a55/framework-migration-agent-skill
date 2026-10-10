// Sums the numbers in a list, ignoring anything that is not a number.
function total(values) {
  return values.filter((v) => typeof v === 'number').reduce((sum, v) => sum + v, 0);
}

module.exports = { total };
