---
kind: positive
findings:
  - { rule: postcss-plugin, file: postcss.config.js, line: 3 }
  - { rule: tailwind-directives, file: src/input.css, line: 1 }
  - { rule: tailwind-directives, file: src/input.css, line: 2 }
  - { rule: tailwind-directives, file: src/input.css, line: 3 }
  - { rule: opacity-utilities, file: src/Profile.jsx, line: 4 }
  - { rule: js-config, file: tailwind.config.js, line: 2 }
manual_items: 1
---
# Expected report — 02-postcss-jsx

A PostCSS build (`postcss-cli`, `autoprefixer`) with JSX templates and a theme that extends spacing
and fonts.

What the migration must do:

- `postcss.config.js`: `tailwindcss` + `autoprefixer` → `@tailwindcss/postcss` (v4 prefixes itself);
  `@tailwindcss/postcss` added to package.json.
- Theme: `fontFamily.display` → `--font-display`; `spacing.18` is dropped because v4's spacing scale
  already makes `p-18` 4.5rem.
- Templates: `shadow` → `shadow-sm`, `blur-sm` → `blur-xs`, `flex-shrink-0` → `shrink-0` (tool);
  `text-gray-900 text-opacity-75` → `text-gray-900/75` (`finish-upgrade.js`).

Manual items: 1 before the migration (`js-config`), none after it: the configuration is moved to CSS and the file removed.
