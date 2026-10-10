---
kind: positive
findings:
  - { rule: dollar-props, file: src/lib/Button.svelte, line: 5 }
  - { rule: event-forwarding, file: src/lib/Button.svelte, line: 5 }
manual_items: 0
---
# Expected report — 03-component-library

A component library: a button that spreads `$$restProps`, renders an optional icon slot (checked with
`$$slots`) and forwards clicks; the package declares `svelte` as a peer dependency and runs
svelte-check.

What the migration must do:

- `Button.svelte`: `$$restProps` → `...rest` from `$props()`, `$$slots.icon` / `<slot name="icon">` →
  an `icon` snippet prop, `<slot />` → `children`, `on:click` forwarding → `createBubbler()`.
- `test/ButtonHost.svelte` (a test host, migrated like any component): `slot="icon"` → snippet.
- Dependencies: svelte → 5.57.1, svelte-check 3.8.6 → 4.7.6. `npm run check` reports no errors after.
- finish-migration.js notes that `peerDependencies.svelte` is `^4.0.0`, which the migration leaves;
  widening it is the library author's call.
