import React from 'react';

// A search field the page can focus and read programmatically.
export default class SearchBox extends React.Component {
  focus() {
    this.refs.input.focus();
  }

  value() {
    return this.refs.input.value;
  }

  render() {
    return <input ref="input" defaultValue={this.props.query} />;
  }
}
