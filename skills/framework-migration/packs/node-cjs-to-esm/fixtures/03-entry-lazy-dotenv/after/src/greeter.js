import 'dotenv/config';
import settings from './settings.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

function greet(name) {
  return `${settings.greeting}, ${name}!`;
}

// The decorations are loaded only when the long form is asked for.
function greetLong(name) {
  const { decorate } = require('./decorate');
  return decorate(greet(name));
}

export { greet, greetLong };
