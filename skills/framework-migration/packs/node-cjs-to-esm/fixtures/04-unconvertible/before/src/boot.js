// The mode must be set before ./mode loads, because it reads it once.
process.env.APP_MODE = process.env.APP_MODE || 'test';
const mode = require('./mode');
const { loadPlugins } = require('./plugins');

const plugins = loadPlugins();

// Drops the cached module so the next require() reads the environment again.
function reloadMode() {
  delete require.cache[require.resolve('./mode')];
  return require('./mode');
}

module.exports = { mode, plugins, reloadMode };
