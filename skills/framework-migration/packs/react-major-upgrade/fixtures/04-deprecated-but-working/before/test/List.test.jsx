import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRef } from 'react';
import TestRenderer from 'react-test-renderer';
import { List } from '../src/List.jsx';

test('List wraps each child in an item', () => {
  const ref = createRef();
  let renderer;
  TestRenderer.act(() => {
    renderer = TestRenderer.create(
      <List>
        <span>a</span>
        <span ref={ref}>b</span>
      </List>,
    );
  });
  const tree = renderer.toJSON();
  assert.equal(tree.type, 'ul');
  assert.deepEqual(
    tree.children.map((li) => li.props['data-has-ref']),
    ['false', 'true'],
  );
});
