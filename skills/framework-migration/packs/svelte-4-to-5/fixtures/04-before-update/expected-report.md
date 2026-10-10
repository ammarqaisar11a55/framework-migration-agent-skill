---
kind: negative
findings:
  - { rule: before-after-update, file: src/ChatLog.svelte, line: 9 }
  - { rule: before-after-update, file: src/ChatLog.svelte, line: 13 }
manual_items: 2
must_remain:
  - { file: src/ChatLog.svelte, contains: "beforeUpdate(() => {" }
  - { file: src/ChatLog.svelte, contains: "afterUpdate(() => {" }
  - { file: src/ChatLog.svelte, contains: "export let messages = [];" }
---
# Expected report — 04-before-update (negative)

A chat log that keeps its scroll position with `beforeUpdate` / `afterUpdate` (the Svelte 4
tutorial's pattern). The migration cannot tell what such callbacks depend on, so it converts nothing
in that file: it adds an `@migration-task` comment and leaves the component in Svelte 4 syntax, which
Svelte 5 still compiles (legacy mode). The parent `Chat.svelte` is migrated to runes and passes props
to it as before.

The test checks that messages render and that the after-update callback runs after each update.

Manual follow-ups (2): move the callbacks to `$effect.pre` and `$effect` (or `tick()`), then remove
the `@migration-task` comment.
