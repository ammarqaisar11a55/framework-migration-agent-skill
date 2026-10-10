---
kind: negative
findings:
  - { rule: space-divide-selector, file: src/index.html, line: 5 }
  - { rule: space-divide-selector, file: src/index.html, line: 5 }
  - { rule: tailwind-directives, file: src/input.css, line: 1 }
  - { rule: tailwind-directives, file: src/input.css, line: 2 }
  - { rule: tailwind-directives, file: src/input.css, line: 3 }
  - { rule: js-config, file: tailwind.config.js, line: 4 }
manual_items: 3
must_remain:
  - { file: tailwind.config.js, contains: "'.text-shadow': { textShadow: '0 1px 2px rgb(0 0 0 / 0.25)' }," }
---
# Expected report — 04-js-plugin (negative)

A configuration with a JavaScript plugin, which cannot be expressed as CSS theme variables, and a
list using `space-y-*` / `divide-y`.

- `@tailwindcss/upgrade` keeps `tailwind.config.js` and loads it with `@config`; the plugin's
  `text-shadow` utility keeps working (`js-config`). Moving the plugin to an `@utility` is a rewrite
  for the project to decide.
- `space-y-2` and `divide-y` stay; their v4 selector targets `:not(:last-child)`, which looks the same
  for block children like these (`space-divide-selector`).

Manual follow-ups: 3.
