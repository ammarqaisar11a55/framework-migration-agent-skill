---
kind: positive
findings:
  - { rule: create-event-dispatcher, file: src/Counter.svelte, line: 7 }
  - { rule: component-instantiation, file: src/main.js, line: 3 }
  - { rule: component-destroy, file: src/main.js, line: 6 }
manual_items: 1
---
# Expected report — 01-runes-counter

A Vite app on Svelte 4: a counter with props, a reactive declaration, a named slot with a slot prop,
a default slot and a dispatched event, mounted with `new App()` and torn down with `$destroy()`.

What the migration must do:

- Dependencies: svelte 4.2.20 → 5.57.1, @sveltejs/vite-plugin-svelte 3.1.2 → 4.0.4 (the migration's
  ranges, pinned by finish-migration.js). vite 5.4.21 already satisfies the migration's range and stays.
- `Counter.svelte`: `export let` → `$props()` with a JSDoc type, `let count` → `$state`, `$: doubled`
  → `$derived`, `on:click` → `onclick`, slots → `footer` / `children` snippets rendered with
  `{@render}`.
- `App.svelte`: `let last` → `$state`, `<p slot="footer" let:count>` → `{#snippet footer({ count })}`.
- `main.js`: `new App({ target })` → `mount(App, { target })`, `app.$destroy()` → `unmount(app)`.

The same tests pass before and after (click, derived value, both slots, the change event, mount and
teardown), and `vite build` succeeds after.

Manual follow-up (1): `createEventDispatcher` still works but is deprecated; moving to a callback prop
changes the parent's `on:change` handler.
