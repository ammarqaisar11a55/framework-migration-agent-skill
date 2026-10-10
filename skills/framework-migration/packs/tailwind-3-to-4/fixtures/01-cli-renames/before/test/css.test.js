const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const css = readFileSync(path.join(root, 'dist/output.css'), 'utf8');
const templates = readdirSync(path.join(root, 'src'))
  .filter((name) => /\.(html|jsx)$/.test(name))
  .map((name) => readFileSync(path.join(root, 'src', name), 'utf8'));

// Class lists of the elements in the templates, by id.
const elements = new Map();
for (const text of templates) {
  for (const m of text.matchAll(/<\w+\s+id="([^"]+)"\s+(?:class|className)="([^"]*)"/g)) elements.set(m[1], m[2].split(/\s+/).filter(Boolean));
}
const allClasses = templates.flatMap((text) => [...text.matchAll(/(?:class|className)="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/).filter(Boolean)));

const escape = (cls) => cls.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
// The declarations of every rule whose selector is exactly this class.
function declarations(cls) {
  const selector = `.${escape(cls)}`;
  const out = [];
  let at = css.indexOf(selector);
  while (at !== -1) {
    const after = css[at + selector.length];
    if (after === ' ' || after === '{' || after === ',' || after === ':') {
      const open = css.indexOf('{', at);
      out.push(css.slice(open + 1, css.indexOf('}', open)));
    }
    at = css.indexOf(selector, at + 1);
  }
  return out.join(';');
}
const of = (id, prefix) => (elements.get(id) ?? []).filter((c) => c.startsWith(prefix)).map(declarations).join(';');

test('every class used in the templates produces CSS', () => {
  const missing = [...new Set(allClasses)].filter((cls) => declarations(cls) === '');
  assert.deepEqual(missing, []);
});

test('the card keeps its small shadow', () => {
  assert.match(of('card', 'shadow'), /0 1px 2px 0/);
});

test('the banner background stays half transparent', () => {
  assert.match(of('banner', 'bg-'), /opacity: 0\.5\b|\/ ?0?\.5\b|50%/);
});

test('the save button keeps a 3px ring', () => {
  assert.match(of('save', 'ring'), /calc\(3px/);
});

test('the name field still grows and hides its outline', () => {
  assert.match(of('name', 'outline') + of('name', 'flex-grow') + of('name', 'grow'), /flex-grow: 1|outline: 2px solid transparent|outline-style: none|outline: none/);
});
