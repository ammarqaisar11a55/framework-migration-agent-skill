'use strict';

exports.titleCase = (text) => text.replace(/\b\w/g, (c) => c.toUpperCase());

exports.wordCount = function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
};
