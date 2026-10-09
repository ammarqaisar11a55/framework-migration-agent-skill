import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { Badge, Price, Notice } from '../src/components.jsx';

test('Badge falls back to its defaults', () => {
  assert.equal(renderToStaticMarkup(<Badge />), '<span class="badge badge-info">New</span>');
  assert.equal(renderToStaticMarkup(<Badge label="Hot" tone="warning" />), '<span class="badge badge-warning">Hot</span>');
});

test('Price falls back to the default currency', () => {
  assert.equal(renderToStaticMarkup(<Price amount={3} />), '<b>$3.00</b>');
  assert.equal(renderToStaticMarkup(<Price amount={3} currency="€" />), '<b>€3.00</b>');
});

test('Notice keeps its class defaultProps', () => {
  assert.equal(renderToStaticMarkup(<Notice />), '<p>Nothing new</p>');
});
