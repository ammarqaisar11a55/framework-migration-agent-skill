const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'templates');

// Fills {{name}} placeholders in templates/<name>.txt.
function render(name, values) {
  const text = fs.readFileSync(path.join(dir, `${name}.txt`), 'utf8');
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => String(values[key] ?? ''));
}

module.exports = { render };
