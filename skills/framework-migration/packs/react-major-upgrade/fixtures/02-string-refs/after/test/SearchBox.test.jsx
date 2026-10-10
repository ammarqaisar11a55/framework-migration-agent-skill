import { createRoot } from "react-dom/client";
import './dom.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ReactDOM from 'react-dom';
import { act } from "react";
import SearchBox from '../src/SearchBox.jsx';

test('the parent can focus and read the field through the component', () => {
  const container = document.getElementById('root');
  let box;
  act(() => {
    const root = createRoot(container);
    root.render(<SearchBox ref={(instance) => (box = instance)} query="react" />);
  });
  box.focus();
  assert.equal(document.activeElement, container.querySelector('input'));
  assert.equal(box.value(), 'react');
});
