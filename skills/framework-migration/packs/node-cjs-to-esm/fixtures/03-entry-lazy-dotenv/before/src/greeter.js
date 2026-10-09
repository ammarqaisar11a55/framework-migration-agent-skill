require('dotenv').config();
const settings = require('./settings');

function greet(name) {
  return `${settings.greeting}, ${name}!`;
}

// The decorations are loaded only when the long form is asked for.
function greetLong(name) {
  const { decorate } = require('./decorate');
  return decorate(greet(name));
}

module.exports = { greet, greetLong };
