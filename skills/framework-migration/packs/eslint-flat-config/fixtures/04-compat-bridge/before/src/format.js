// Formats an amount of cents as a price.
function price(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

module.exports = { price };
