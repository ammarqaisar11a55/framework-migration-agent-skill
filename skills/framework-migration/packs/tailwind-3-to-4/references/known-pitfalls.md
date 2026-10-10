# Known pitfalls

## How the official tool is run

`@tailwindcss/upgrade` changes files in place and installs packages itself; it has no dry-run.
`official-upgrade.mjs` therefore runs it on a scratch copy with its own `npm install`, prints the
diff, and copies the changes back (the project's `node_modules` is untouched until the stage's
`npm install`). A project without a lockfile does not get one from the scratch run.

## What the pack adds to the tool

- **Removed opacity utilities.** The tool leaves `bg-opacity-*`, `text-opacity-*`, `border-opacity-*`,
  `divide-opacity-*`, `ring-opacity-*` and `placeholder-opacity-*` in templates, but v4 no longer
  generates them, so the transparency silently disappears. `finish-upgrade.js` merges each into the
  one colour utility of the same kind and variant in the same class list (`bg-brand bg-opacity-50` →
  `bg-brand/50`). Class lists built in code (`clsx(...)`, template strings) and lists with zero or
  several candidate colours are left and reported (rule `opacity-utilities`).
- **The CLI package.** v4's CLI is `@tailwindcss/cli` (binary still `tailwindcss`); the tool does not
  add it, so a CLI build script fails with "tailwindcss: not found". `finish-upgrade.js` adds it.

## Renamed utilities

The tool renames utilities so the result looks like v3: `shadow-sm` → `shadow-xs`, `shadow` →
`shadow-sm`, `rounded` → `rounded-sm`, `blur-sm` → `blur-xs`, `ring` → `ring-3`, `outline-none` →
`outline-hidden`, `flex-grow` → `grow`, `overflow-ellipsis` → `text-ellipsis`, and so on. v4 reuses
several old names for other sizes, so a class name alone cannot tell which version it is for — the
pack has no rule for them. Read the template diff; classes assembled at runtime (string
concatenation, maps of class names) are not seen by the tool and must be renamed by hand.

## Behaviour v4 changes on purpose

- **Default border colour** is `currentColor` (was gray-200). The tool adds a compatibility block to
  the CSS; remove it once every border has an explicit colour.
- **space-x/y and divide-x/y** use a new selector (rule `space-divide-selector`): identical for block
  children; inline elements or children with their own margins can differ.
- **Placeholder colour, button cursor, dialog margins** follow the new Preflight; see the guide.
- **Browsers:** v4 targets Safari 16.4+, Chrome 111+ and Firefox 128+. Projects that support older
  browsers should stay on v3.4.

## JavaScript configuration

Static configuration moves into CSS (`@theme`) and the file is removed. A configuration with plugins
or computed values stays and is loaded with `@config` (rule `js-config`) — it keeps working; moving
plugins to `@utility` / `@plugin` is a later, separate change. `corePlugins`, `separator` and
`safelist` are not supported in v4 (rule `config-options-removed`); use `@source inline(...)` for a
safelist.

## Testing CSS

A build that succeeds can still lose styles. The fixtures build the CSS and check that every class
used in the templates generates CSS (catches removed utilities), and that a few elements keep their
look — the same shadow offsets, the 3px ring, the 50% transparency — by reading the generated
declarations, which differ in form between v3 and v4 but not in value. Projects without such tests
should compare the pages in a browser before and after, as the upgrade guide recommends.
