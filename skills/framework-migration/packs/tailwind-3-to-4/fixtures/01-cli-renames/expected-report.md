---
kind: positive
findings:
  - { rule: opacity-utilities, file: src/index.html, line: 6 }
  - { rule: tailwind-directives, file: src/input.css, line: 1 }
  - { rule: tailwind-directives, file: src/input.css, line: 2 }
  - { rule: tailwind-directives, file: src/input.css, line: 3 }
  - { rule: js-config, file: tailwind.config.js, line: 2 }
manual_items: 1
---
# Expected report — 01-cli-renames

A Tailwind CLI build with a theme colour, and templates using utilities v4 renames or removes.

What the migration must do:

- `@tailwindcss/upgrade`: `@tailwind` directives → `@import 'tailwindcss'`; the theme colour →
  `@theme { --color-brand: ... }` and `tailwind.config.js` removed; a compatibility block that keeps
  v3's default border colour; templates: `shadow-sm` → `shadow-xs`, `rounded` → `rounded-sm`,
  `overflow-ellipsis` → `text-ellipsis`, `outline-none` → `outline-hidden`, `flex-grow` → `grow`,
  `ring` → `ring-3` (each keeps v3's look); `tailwindcss` → `^4.3.3`.
- `finish-upgrade.js`: `bg-brand bg-opacity-50` → `bg-brand/50`, which the tool leaves although v4
  removes `bg-opacity-*`; add `@tailwindcss/cli`, since the build script runs the CLI.

The fixture's test builds the CSS and checks that every class in the templates generates CSS, and
that the card's shadow, the banner's 50% background, the button's 3px ring and the input's outline and
growth stay the same, on v3 before and v4 after. Manual items: 1 before the migration (`js-config`), none after it: the configuration is moved to CSS and the file removed.
