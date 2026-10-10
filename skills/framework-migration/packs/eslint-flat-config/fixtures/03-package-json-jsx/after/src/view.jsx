/** @jsx h */
// eslint-disable-next-line no-unused-vars -- used by the JSX pragma
const { h } = require('./h');

function Badge(props) {
  return <span className="badge">{props.label}</span>;
}

module.exports = { Badge };
