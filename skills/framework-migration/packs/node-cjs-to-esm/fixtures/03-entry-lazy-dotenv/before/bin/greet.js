#!/usr/bin/env node
const { greet } = require('../src/greeter');
const format = require('../src/format');

function main(argv) {
  return format(greet(argv[2] || 'world'));
}

// Runs only when executed directly, not when required by the tests.
if (require.main === module) {
  console.log(main(process.argv));
}

module.exports = { main };
