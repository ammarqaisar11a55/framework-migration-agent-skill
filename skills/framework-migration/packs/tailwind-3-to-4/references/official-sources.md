# Official sources

`tailwindcss.com` was not reachable from the environment the pack was written in. The upgrade guide
was checked against its source in `tailwindlabs/tailwindcss.com`, which the published page is built
from.

| Source | URL | Used for | Verified via | Verified |
|---|---|---|---|---|
| Tailwind CSS v4 upgrade guide | https://tailwindcss.com/docs/upgrade-guide | The upgrade tool (`npx @tailwindcss/upgrade`, Node.js 20+, "review the diff"); PostCSS plugin and CLI moved to `@tailwindcss/postcss` / `@tailwindcss/cli`; removed `@tailwind` directives; removed deprecated utilities (`*-opacity-*` → opacity modifiers); renamed utilities; space/divide selector change; default border and ring changes; `@utility`; `theme()`; JavaScript config via `@config`; unsupported `corePlugins`, `safelist`, `separator`; browser support (Safari 16.4+, Chrome 111+, Firefox 128+) | `tailwindlabs/tailwindcss.com` `src/docs/upgrade-guide.mdx` | 2026-10-09 |
| `@tailwindcss/upgrade` 4.3.3 | https://www.npmjs.com/package/@tailwindcss/upgrade | Options (`--config`, `--force`; no dry-run mode); behaviour observed on each fixture: installs packages itself, leaves `*-opacity-*` utilities, keeps JavaScript configs with plugins via `@config`, does not add `@tailwindcss/cli` | `--help` and runs on the fixtures | 2026-10-09 |
| `@tailwindcss/cli` 4.3.3 | https://www.npmjs.com/package/@tailwindcss/cli | Provides the `tailwindcss` binary in v4 | `npm view @tailwindcss/cli@4.3.3 bin` | 2026-10-09 |
