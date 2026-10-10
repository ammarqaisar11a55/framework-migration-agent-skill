# Official sources

`angular.dev` was not reachable from the environment the pack was written in. The update guide
(`angular.dev/update-guide`) is generated from `adev/src/app/features/update/recommendations.ts` in
`angular/angular` (commit `afe84868`), which was read for the v21 and v22 steps; the migrations from
the npm packages that ng update runs.

| Source | URL | Used for | Verified via | Verified |
|---|---|---|---|---|
| Angular update guide, v21 and v22 steps | https://angular.dev/update-guide | One major at a time with `ng update @angular/core@<major> @angular/cli@<major>`; v21: `provideZoneChangeDetection` for zone apps, `moduleId` / `interpolation` removed, `NgModuleFactory` removed, `ApplicationConfig` from core, TypeScript 5.9; v22: Node.js and TypeScript 6.0 requirements, components OnPush by default (`Eager` to keep), `strictTemplates` default, `?.` returns `undefined`, `provideRoutes` / `ComponentFactoryResolver` / Hammer.js removed, `fullTemplateTypeCheck` removed, `paramsInheritanceStrategy` default `always`, webpack builders deprecated, experimental test builders removed | `angular/angular` `adev/src/app/features/update/recommendations.ts` | 2026-10-10 |
| `@angular/core` 21.2.24 and 22.2.0 migrations | https://www.npmjs.com/package/@angular/core | Which migrations ng update runs and which are optional (`schematics/migrations.json`); engines (`^22.22.3 \|\| ^24.15.0 \|\| >=26` for 22); `ChangeDetectionStrategy` (OnPush default, `Default` deprecated for `Eager`) | npm packages; runs on the fixtures | 2026-10-10 |
| `@angular/cli` / `@schematics/angular` 21.2.24 and 22.2.0 | https://www.npmjs.com/package/@angular/cli | Workspace migrations (`moduleResolution`, `lib`, workspace config) and optional ones (`use-application-builder`, `migrate-karma-to-vitest`); the temporary-CLI behaviour and `NG_DISABLE_VERSION_CHECK` (`src/commands/update/cli.js`, `utilities/cli-version.js`) | npm packages | 2026-10-10 |
| `@angular/build` 20.3.37 / 21.2.24 / 22.2.0 | https://www.npmjs.com/package/@angular/build | Peer ranges for vitest (`^3.1.1` → `^4.0.8` → `^4.0.8 \|\| ^5.0.0`) and TypeScript (`<6.0` → `>=6.0 <6.1`) | `npm view` | 2026-10-10 |
