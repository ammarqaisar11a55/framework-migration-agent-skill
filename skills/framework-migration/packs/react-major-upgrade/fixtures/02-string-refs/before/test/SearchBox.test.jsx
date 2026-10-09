import './dom.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import SearchBox from '../src/SearchBox.jsx';

test('the parent can focus and read the field through the component', () => {
  const container = document.getElementById('root');
  let box;
  act(() => {
    ReactDOM.render(<SearchBox ref={(instance) => (box = instance)} query="react" />, container);
  });
  box.focus();
  assert.equal(document.activeElement, container.querySelector('input'));
  assert.equal(box.value(), 'react');
});
