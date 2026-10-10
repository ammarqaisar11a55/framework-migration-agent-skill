# Known pitfalls

**The official migration is prompt-driven.** `npx sv migrate svelte-5` asks for confirmation, the
folders to migrate and whether to convert components, and cannot be answered from a script.
`official-migrate.mjs` calls the same functions with the defaults (every top-level folder except
`node_modules` and dot folders; convert components). Run `npx sv migrate svelte-5` yourself only if
the project needs a different folder selection.

**Svelte 3 and SvelteKit 1 go first.** The runner stops when `svelte` is below 4 or `@sveltejs/kit`
below 2, as the official script does; run `npx sv migrate svelte-4` or `npx sv migrate sveltekit-2`,
check, commit, and start again.

**Components with `beforeUpdate` / `afterUpdate` are not converted.** The migration prepends an
`<!-- @migration-task ... -->` comment and leaves the whole file in Svelte 4 syntax. That is fine:
Svelte 5 compiles non-runes components in legacy mode, and they interoperate with runes components.
Convert them later with `$effect.pre` (for `beforeUpdate`) and `$effect` or `tick()` (for
`afterUpdate`), then delete the comment.

**`run()` is not `$effect`.** A `$:` block with side effects becomes `run(() => ...)` from
`svelte/legacy`, which runs before the DOM updates (like `$effect.pre`) and also once on the server.
Replacing it with `$effect` changes both; decide per case.

**`createEventDispatcher` keeps working but is deprecated.** Parents still listen with `on:name`, and
a runes-mode parent can do so. Converting to callback props changes the component's public API: the
handler receives the detail, not a `CustomEvent`, and every parent must change at once.

**`<svelte:options accessors>` became invalid markup.** svelte 5.57's `migrate()` removes the word
`accessors` with a regular expression and leaves `={true}` behind, which does not compile.
`finish-migration.js` removes the orphan value (and an empty `<svelte:options />`). The props stay
readable on the instance because the migration exports them (`export { value }`).

**`$$props` with `<svelte:component this={prop}>`.** The migration renames prop references to
`props.<name>` but not the expression it moves into `const SvelteComponent = $derived(...)`, which
then reads an undeclared variable at run time. Check the diff of every file that used `$$props`.

**Whitespace is collapsed differently.** Svelte 5 removes whitespace at the start and end of a tag and
collapses the rest, so `textContent` can lose spaces Svelte 4 kept. Tests that compare whole text
blocks may need to compare elements instead; the rendered page looks the same unless inline elements
relied on that whitespace.

**Libraries need a wider peer range.** The migration does not touch `peerDependencies`; a component
library that declares `svelte: ^4.0.0` is reported, so the range can be widened once the components
are tested on Svelte 5.

**Caret ranges become exact versions.** The migration writes ranges such as `svelte ^5.0.0` and
`@sveltejs/vite-plugin-svelte ^4.0.0`; `finish-migration.js` pins each range it wrote to the version in
`pack.yaml`, so the result does not depend on the day it is installed. Packages the migration did not
change stay as they were.
