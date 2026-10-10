import './dom.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act } from "react";
import { mount } from '../src/main.jsx';

test('mounts the app and handles clicks', () => {
  const container = document.getElementById('root');
  act(() => {
    mount(container);
  });
  assert.equal(container.textContent, 'Clicked 1 times');
  act(() => {
    container.querySelector('button').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
  assert.equal(container.textContent, 'Clicked 2 times');
});
