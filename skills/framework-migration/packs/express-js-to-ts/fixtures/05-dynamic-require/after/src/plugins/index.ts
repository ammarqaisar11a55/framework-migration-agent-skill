import fs from 'fs';
import path from 'path';

// Every other file in this directory is a plugin, loaded by name at runtime.
function loadPlugins() {
  return fs
    .readdirSync(__dirname)
    .filter((file) => file !== 'index.js' && file.endsWith('.js'))
    .sort()
    .map((file) => require(path.join(__dirname, file)));
}

export { loadPlugins };
