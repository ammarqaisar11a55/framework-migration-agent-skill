import config from '../config.js';
import { version } from './version.mjs';

export function greet(name = config.defaultName) {
  return `${config.greeting}, ${name}!`;
}

export { version };
