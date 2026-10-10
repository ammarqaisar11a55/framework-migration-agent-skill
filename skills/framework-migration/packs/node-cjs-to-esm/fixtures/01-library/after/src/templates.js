import fs from 'fs';
import path from 'path';

const dir = path.join(import.meta.dirname, 'templates');

// Fills {{name}} placeholders in templates/<name>.txt.
function render(name, values) {
  const text = fs.readFileSync(path.join(dir, `${name}.txt`), 'utf8');
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => String(values[key] ?? ''));
}

export { render };
