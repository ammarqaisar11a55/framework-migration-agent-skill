# Official sources

`docs.junit.org` and `docs.openrewrite.org` were not reachable from the environment the pack was
written in. The JUnit user guide was read from its source in `junit-team/junit-framework` (tag
`r5.14.4`, commit `3331ea27`), and the recipe from `openrewrite/rewrite-testing-frameworks` (tag
`v3.44.0`, commit `23a04efc`).

| Source | URL | Used for | Verified via | Verified |
|---|---|---|---|---|
| JUnit 5 user guide: migrating from JUnit 4 | https://docs.junit.org/current/user-guide/#migrating-from-junit4 | The Vintage engine runs JUnit 4 tests on the JUnit Platform (`junit-vintage-engine` on the test runtime path), so migrated and unmigrated classes can coexist; annotation and assertion differences (message argument last); rules are not supported by Jupiter except through the limited migration support | `documentation/modules/ROOT/pages/migrating-from-junit4.adoc` | 2026-10-10 |
| OpenRewrite `JUnit4to5Migration` (rewrite-testing-frameworks 3.44.0) | https://docs.openrewrite.org/recipes/java/testing/junit5/junit4to5migration | What the recipe converts (lifecycle annotations, `@Ignore`, assertions and assumptions, `TemporaryFolder`, `ExpectedException`, `Timeout`, `TestName`, `Parameterized` and JUnitParams runners, `Enclosed`, Mockito runner/rule, categories) and that it removes `junit:junit` and `junit-vintage-engine` | `src/main/resources/META-INF/rewrite/junit5.yml`; runs on the fixtures | 2026-10-10 |
| rewrite-maven-plugin 6.46.1 | https://docs.openrewrite.org/reference/rewrite-maven-plugin | Running recipes by plugin coordinates without editing the pom (`-Drewrite.recipeArtifactCoordinates`, `-Drewrite.activeRecipes`, `-Drewrite.exclusions`); `dryRun` writes `target/rewrite/rewrite.patch` | Maven Central metadata; runs on the fixtures | 2026-10-10 |
