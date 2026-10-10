import { Children } from 'react';
import PropTypes from 'prop-types';

// Renders each child in a list item, keyed by the child's own key.
export function List({ children }) {
  return (
    <ul>
      {Children.map(children, (child) => (
        <li data-has-ref={String(child.ref != null)}>{child}</li>
      ))}
    </ul>
  );
}

List.propTypes = {
  children: PropTypes.node,
};
