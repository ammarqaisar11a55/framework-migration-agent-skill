---
kind: positive
findings:
  - { rule: options-accessors, file: src/Field.svelte, line: 1 }
  - { rule: event-forwarding, file: src/Field.svelte, line: 7 }
  - { rule: event-modifiers, file: src/Form.svelte, line: 9 }
  - { rule: reactive-side-effect, file: src/Title.svelte, line: 5 }
manual_items: 1
---
# Expected report — 02-legacy-stopgaps

Constructs the migration can only convert with helpers from `svelte/legacy`.

What the migration must do:

- `Form.svelte`: `on:submit|preventDefault={submit}` → `onsubmit={preventDefault(submit)}`.
- `Title.svelte`: `$: greeting = ...` → `$derived`; the `$: { document.title = ... }` block →
  `run(() => { ... })`.
- `Field.svelte`: `on:input` forwarding → `oninput={bubble('input')}` with `createBubbler()`; the
  `value` prop becomes `$bindable` and is exported, replacing `accessors`. The migration leaves
  `<svelte:options ={true} />`, which does not compile; finish-migration.js removes the tag.
- svelte 4.2.20 → 5.57.1.

The tests check behaviour, not syntax: the submit's default action is prevented, `document.title`
follows the name, input events reach the parent, and the value is readable on the instance.

Manual follow-up (1): replace `run()` in `Title.svelte` with `$effect` or keep it (it runs before the
DOM updates and on the server, as `$:` did).
