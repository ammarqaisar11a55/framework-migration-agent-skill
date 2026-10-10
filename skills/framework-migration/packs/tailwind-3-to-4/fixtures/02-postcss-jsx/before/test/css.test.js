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

test('custom spacing and font family come from the theme', () => {
  assert.match(of('profile', 'p-18'), /4\.5rem|calc\(var\(--spacing\) \* 18\)/);
  assert.match(of('profile', 'font-display'), /Georgia|var\(--font-display\)/);
});

test('the profile card keeps its default shadow', () => {
  assert.match(of('profile', 'shadow'), /0 1px 3px 0/);
});

test('the name keeps 75% text opacity', () => {
  assert.match(of('name', 'text-'), /opacity: 0\.75\b|\/ ?0?\.75\b|75%/);
});

test('the avatar keeps a 4px blur', () => {
  assert.match(of('avatar', 'blur'), /blur\(4px\)|--blur-xs/);
});
