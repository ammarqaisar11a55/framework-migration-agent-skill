'use strict';

const { separator } = require('./defaults.json');

// Lower-case words joined by the separator, with everything else dropped.
module.exports = function slugify(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join(separator);
};
