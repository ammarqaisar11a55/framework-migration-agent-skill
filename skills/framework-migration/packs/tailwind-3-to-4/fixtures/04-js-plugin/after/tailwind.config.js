const plugin = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.html'],
  theme: { extend: {} },
  plugins: [
    // Generated from code, so it cannot be expressed as CSS theme variables.
    plugin(({ addUtilities }) => {
      addUtilities({
        '.text-shadow': { textShadow: '0 1px 2px rgb(0 0 0 / 0.25)' },
      });
    }),
  ],
};
