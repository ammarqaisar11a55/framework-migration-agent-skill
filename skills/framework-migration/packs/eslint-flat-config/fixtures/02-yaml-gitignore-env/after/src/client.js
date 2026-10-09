/* global document -- eslint-env browser */
// Turns an element into a click counter. Runs in the browser bundle.
function mount(id) {
  const el = document.getElementById(id);
  let count = 0;
  el.addEventListener('click', () => {
    count += 1;
    el.textContent = String(count);
  });
  return el;
}

module.exports = { mount };
