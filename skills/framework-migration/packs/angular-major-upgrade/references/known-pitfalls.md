# Known pitfalls

**Node.js for Angular 22.** Angular 22 requires Node.js `^22.22.3 || ^24.15.0 || >=26.0.0`. The
`angular-22` stage stops before changing anything on an older Node.js; upgrade it (and CI) first.

**npm 10 and Vitest 4.1.** npm 10's resolver crashes ("Cannot read properties of null (reading
'edgesOut')") on Angular 21+ projects with vitest 4.1, through vite 8's `@vitejs/devtools` peers —
even a fresh `ng new` project. When the project's vitest is outside the target's peer range, the
stage passes `vitest@4.0.18` to ng update instead of letting it pick the newest 4.x. Projects
already on vitest 4.1 with npm 10 need npm 11.

**One major at a time.** Each stage updates one major; a project on 21 starts at `angular-22` (the
`angular-21` stage reports it has nothing to do).

**Change detection.** Angular 22 makes OnPush the default. The update adds
`changeDetection: ChangeDetectionStrategy.Eager` to every component without a strategy, so behaviour
stays the same; switching components to OnPush later needs signals or `markForCheck()` wherever
state changes outside template events.

**`strictTemplates` and extended diagnostics.** For projects that never set `strictTemplates`, two
22.2 migrations write `strictTemplates: false` and an `extendedDiagnostics` block that the compiler
rejects together (NG4003). finish-update.js removes the block. Turning `strictTemplates` on later is
worth doing; expect template type errors such as `$event.target.value`.

**`?.` returns `undefined`.** Template expressions comparing an optional chain with `null` are wrapped
in `$safeNavigationMigration(...)`. The wrapper keeps the old result; rewrite the comparison
(`== null`) and drop it when convenient.

**Optional migrations are not run.** `router-current-navigation`, `use-application-builder` and
`migrate-karma-to-vitest` run only on request (`ng update @angular/core --name ...`); rules
`router-get-current-navigation` and `webpack-builders` report what they would change.

**Formatting.** The migrations reformat the files they touch (for example single to double quotes).
Run the project's formatter after the stage if it has one.

**Third-party Angular libraries.** ng update refuses to proceed when a library's peer range excludes
the target (for example an `@ngrx/*` or `@angular-eslint/*` version for the previous major). Update
those with `ng update <package>@<major>` in the same command, or wait for a compatible release;
`@angular/material` and `@angular/cdk` are included automatically.

**Formatting depends on Prettier.** `ng update` formats the files its migrations change with Prettier
when the project can resolve it (`require.resolve("prettier")` from the workspace, which includes
`NODE_PATH`). Without Prettier the migrated files keep their quotes and line breaks. Commit the
project's own formatting after the stage if the diff is noisy.
