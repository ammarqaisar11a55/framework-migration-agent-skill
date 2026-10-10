# Known pitfalls

**The target is PHP 8.0.** Rector runs its upgrade sets up to 8.0, so the code keeps working on every
8.x. Deprecations added in 8.1–8.4 (`strftime`, `utf8_encode`, `"${var}"`, `FILTER_SANITIZE_STRING`,
passing null to non-nullable internal parameters) are not rewritten; the rules report the ones a
pattern can find as manual items. Run Rector's later sets (`withPhpSets(php83: true)`) yourself once
production runs that version.

**Behaviour changes need review, not rewrites.** `0 == "abc"` is false in PHP 8 (it was true), and
`is_resource()` is false for curl, GD, socket, XML and OpenSSL handles, which are objects now. Both
compile and run; only the result changes. The rules flag loose comparisons with 0 and every
`is_resource()` call.

**`switch` becomes `match` only where it is safe.** Rector converts a `switch` whose cases all return
or assign; `match` compares strictly, so a `switch` that relied on loose matching of strings and
numbers behaves differently if the input types vary. The fixtures' tests cover the converted code;
check your own tests do too.

**composer.json moves to `^8.0`.** require-php8.js sets `require.php` to `^8.0` when it still allows
7.x, and leaves `config.platform.php` (it notes it): change it to the PHP version production runs
before `composer update`, or Composer keeps resolving PHP 7 dependency versions.

**Dependencies are not upgraded.** Libraries pinned to versions that do not support PHP 8 fail to
install or run. Run `composer update` (or `composer why-not php 8.0`) after the stage and upgrade
what blocks.

**Rector is installed outside the project.** The stage installs the pinned Rector with Composer into
the cache (`~/.cache/framework-migration/rector-<version>`), so the project's composer.json and lock
file are untouched. The project needs `vendor/` installed (`composer install`): Rector loads its
autoloader to resolve the project's classes.

**Verification runs on the PHP you have.** The fixtures' baseline runs on PHP 8 too (the evals have no
PHP 7 runtime), so the tests prove the migrated code is correct on 8, not that the original ran on 7.
