'use strict';

const slugify = require('./slugify');
const { titleCase, wordCount } = require('./text');
const { render } = require('./templates');
const defaults = require('./defaults.json');

module.exports = { slugify, titleCase, wordCount, render, defaults };
