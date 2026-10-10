# Official sources

`svelte.dev` was not reachable from the environment the pack was written in. The migration guide was
checked against its source in `sveltejs/svelte` (commit `707c2814`), which the published page is
built from; the migration tool against its published npm package.

| Source | URL | Used for | Verified via | Verified |
|---|---|---|---|---|
| Svelte 5 migration guide | https://svelte.dev/docs/svelte/v5-migration-guide | The migration script (`npx sv migrate svelte-5`) and what it converts (runes, event attributes, slots → snippets, `new Component()` → `mount()`, dependency bumps); `run` and event-modifier helpers from `svelte/legacy` as stop-gaps; not migrated: `createEventDispatcher`, `beforeUpdate` / `afterUpdate` (`$effect.pre` + `tick`); components are functions (`mount`, `hydrate`, `unmount`; `$on` → `events`, `$set` → `$state` props, `$destroy` → `unmount`); `accessors` and `immutable` ignored in runes mode; whitespace handling; modern browser required | `sveltejs/svelte` `documentation/docs/07-misc/07-v5-migration-guide.md` | 2026-10-10 |
| `sv` 1.1.1 (`sv migrate`) | https://www.npmjs.com/package/sv | `sv migrate svelte-5` is a legacy migration that runs `svelte-migrate@1 svelte-5` | `dist/bin.mjs` of the npm package (`legacyMigrations`) | 2026-10-10 |
| `svelte-migrate` 1.10.3 | https://www.npmjs.com/package/svelte-migrate | The steps `official-migrate.mjs` reproduces without the prompts: Svelte 3 / SvelteKit 1 prerequisites, folder selection (top-level folders except `node_modules` and dot folders), `update_pkg_json_content` (ranges written), `transform_module_code` on scripts and `.js`/`.ts` files, `migrate` from `svelte/compiler` on `.svelte` files | `migrations/svelte-5/index.js`, `migrations/svelte-5/migrate.js`, `utils.js` of the npm package | 2026-10-10 |
| `svelte` 5.57.1 `migrate()` | https://www.npmjs.com/package/svelte | Behaviour observed on the fixtures: `@migration-task` comment and unchanged file for `beforeUpdate` / `afterUpdate`; `createBubbler`, `preventDefault`, `run` from `svelte/legacy`; `accessors` removal leaving `={true}` (`src/compiler/migrate/index.js`, also in 5.57.2) | runs on the fixtures; compiler source | 2026-10-10 |
| `@sveltejs/vite-plugin-svelte` 4.0.4 | https://www.npmjs.com/package/@sveltejs/vite-plugin-svelte | Peer ranges: `svelte ^5`, `vite ^5` — the major the migration selects | `npm view ... peerDependencies` | 2026-10-10 |
