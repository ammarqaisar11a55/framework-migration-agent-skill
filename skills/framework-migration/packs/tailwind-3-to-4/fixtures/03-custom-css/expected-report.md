---
kind: positive
findings:
  - { rule: tailwind-directives, file: src/input.css, line: 1 }
  - { rule: tailwind-directives, file: src/input.css, line: 2 }
  - { rule: tailwind-directives, file: src/input.css, line: 3 }
  - { rule: theme-function, file: src/input.css, line: 11 }
  - { rule: theme-function, file: src/input.css, line: 12 }
  - { rule: layer-custom-utilities, file: src/input.css, line: 16 }
  - { rule: js-config, file: tailwind.config.js, line: 2 }
manual_items: 1
---
# Expected report — 03-custom-css

Custom CSS: a component class built with `@apply`, `theme()` calls, and a custom utility in
`@layer utilities`.

What the migration must do (`@tailwindcss/upgrade`):

- `@layer components { .btn {...} }` and `@layer utilities { .content-auto {...} }` → `@utility`
  blocks, so the classes work with variants in v4.
- Inside `@apply`: `rounded` → `rounded-sm`, `shadow-sm` → `shadow-xs`.
- `theme(colors.accent)` → `var(--color-accent)`, `theme(colors.white)` → `var(--color-white)`.

Manual items: 1 before the migration (`js-config`), none after it: the configuration is moved to CSS and the file removed.
