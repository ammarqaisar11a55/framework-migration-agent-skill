import React from 'react';
import PropTypes from 'prop-types';

export function Badge({ label = 'New', tone = 'info' }) {
  return <span className={`badge badge-${tone}`}>{label}</span>;
}

Badge.propTypes = {
  label: PropTypes.string,
  tone: PropTypes.oneOf(['info', 'warning']),
};

export const Price = ({ amount, currency = '$' }) => (
  <b>
    {currency}
    {amount.toFixed(2)}
  </b>
);

// Class components keep defaultProps in React 19.
export class Notice extends React.Component {
  render() {
    return <p>{this.props.text}</p>;
  }
}

Notice.defaultProps = { text: 'Nothing new' };
