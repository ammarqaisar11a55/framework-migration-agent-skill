// A tiny element factory, used as the JSX pragma.
function h(tag, props, ...children) {
  return { tag, props: props || {}, children };
}

module.exports = { h };
