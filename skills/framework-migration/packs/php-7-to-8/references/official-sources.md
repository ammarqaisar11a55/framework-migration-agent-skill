# Official sources

`www.php.net` and `getrector.com` were not reachable from the environment the pack was written in.
The PHP manual was read from its source in `php/doc-en` (commit `a18c79a`, 2026-10-09; the
`appendices/migration8x` files are the migration guides published on php.net), and Rector from the
`rector/rector` 2.6.7 package the stage installs.

| Source | URL | Used for | Verified via | Verified |
|---|---|---|---|---|
| PHP 8.0 backward-incompatible changes | https://www.php.net/manual/en/migration80.incompatible.php | String-to-number comparison semantics (`#migration80.incompatible.core.string-number-comparision`), resources that became objects so `is_resource()` checks fail (`#migration80.incompatible.resource2object`), removed functions (`each`, `create_function`, `money_format`, `hebrevc`, `convert_cyr_string`, `restore_include_path`, `ezmlm_hash`, `fgetss`, `get_magic_quotes_*`, `image2wbmp`, `ldap_sort`, `read_exif_data`) | `appendices/migration80/incompatible.xml` | 2026-10-10 |
| PHP 8.0 new features | https://www.php.net/manual/en/migration80.new-features.php | `str_contains`, `str_starts_with`, `str_ends_with`, `match`, constructor promotion, `::class` on objects, `Stringable`, non-capturing catches | `appendices/migration80/new-features.xml` | 2026-10-10 |
| PHP 8.1 deprecations | https://www.php.net/manual/en/migration81.deprecated.php | `strftime` / `gmstrftime`, `FILTER_SANITIZE_STRING` / `FILTER_SANITIZE_STRIPPED`, `date_sunrise` / `date_sunset`, `strptime`, `mhash*` | `appendices/migration81/deprecated.xml` | 2026-10-10 |
| PHP 8.2 deprecations | https://www.php.net/manual/en/migration82.deprecated.php | `"${var}"` / `"${expr}"` interpolation, `utf8_encode` / `utf8_decode` | `appendices/migration82/deprecated.xml` | 2026-10-10 |
| PHP 7.0 new features | https://www.php.net/manual/en/migration70.new-features.php | The null coalescing operator `??` | `appendices/migration70/new-features.xml` | 2026-10-10 |
| Rector 2.6.7 (`rector/rector`) | https://github.com/rectorphp/rector | `RectorConfig::configure()->withPhpSets(php80: true)` applies every PHP upgrade set up to 8.0 (a ceiling, one version only); `withPhpVersion()` sets the target version, which otherwise comes from composer.json; the php72/php74/php80 sets' rules (`ListEachRector`, `CreateFunctionToAnonymousFunctionRector`, `MoneyFormatToNumberFormatRector`, `HebrevcToNl2brHebrevRector`, `RestoreIncludePathToIniRestoreRector`, `StrContainsRector`, `StrStartsWithRector`, `StrEndsWithRector`, `ClassOnObjectRector`, `ChangeSwitchToMatchRector`, `ClassPropertyAssignToConstructorPromotionRector`, `StringableForToStringRector`, `RemoveUnusedVariableInCatchRector`) | `src/Configuration/RectorConfigBuilder.php`, `config/set/php72.php`, `php74.php`, `php80.php` in the 2.6.7 package; runs on the fixtures | 2026-10-10 |
| Rector documentation | https://getrector.com/documentation | Installing with Composer and running `vendor/bin/rector process` (`--dry-run`, `--config`, `--autoload-file`) | `README.md` and `bin/rector` options in the 2.6.7 package | 2026-10-10 |
