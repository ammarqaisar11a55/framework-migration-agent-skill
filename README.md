# framework-migration-agent-skill

An [Agent Skill](skills/framework-migration/SKILL.md) that gives an AI agent a structured, repeatable
way to migrate an application from one framework (or major version) to another.

One generic **migration engine** plus pluggable **migration packs**. Each pack covers exactly one
`source → target` path; adding a framework means adding a pack, not changing the engine.

> **Status:** the engine and the packs marked `shipped` below are complete (milestones M1–M8 of
> [PLAN.md](PLAN.md), plus M9 packs), and the engine has been tried
> end to end on a real open-source Express app (see [DECISIONS.md](DECISIONS.md) D15–D16). See the
> [eval scorecard](evals/scorecard.md). The other packs are planned.

## Install

Requires Node.js 20.19 or newer, npm and git.

The skill uses the open [Agent Skills](https://agentskills.io) format (a folder with a `SKILL.md`),
which Claude Code, Codex and Cursor all load. `fm install-skill` copies it to where each one looks:

```bash
# In the project you want to migrate: for Claude Code, Codex and Cursor at once
npx -y -p framework-migration-agent-skill fm install-skill

# Or for one tool, and/or for your user account instead of one project
npx -y -p framework-migration-agent-skill fm install-skill --client claude   # .claude/skills/
npx -y -p framework-migration-agent-skill fm install-skill --client codex    # .agents/skills/
npx -y -p framework-migration-agent-skill fm install-skill --client cursor   # .cursor/skills/
npx -y -p framework-migration-agent-skill fm install-skill --client codex --user  # $CODEX_HOME/skills (~/.codex/skills)
```

| Tool | Project scope | User scope (`--user`) |
|---|---|---|
| Claude Code (`--client claude`) | `.claude/skills/` | `~/.claude/skills/` |
| Codex (`--client codex`) | `.agents/skills/` | `$CODEX_HOME/skills/` (default `~/.codex/skills/`) |
| Cursor (`--client cursor`) | `.cursor/skills/` | `~/.cursor/skills/` |
| Any Agent Skills client (`--client agents`) | `.agents/skills/` | `~/.agents/skills/` |

The default, `--client all`, writes `.claude/skills/` and `.agents/skills/`: Claude Code reads the
first, Codex the second, and Cursor both (it also reads `.claude/skills/` and `.codex/skills/`).
Commit the folders to share the skill with your team. Running the command again replaces an earlier
install.

The installed folder holds `SKILL.md` and each pack's `pack.yaml`, `rules/` and `references/`. The
engine itself is not copied: `SKILL.md` tells the agent to run it with
`npx -y -p framework-migration-agent-skill@<version> fm`, pinned to the version that installed it, so
the instructions and the engine always match. From a clone of this repository (for example before a
release is on npm), install with `npm run fm -- install-skill --project <dir>`; the agent then runs
the engine from the clone with `npm run fm --`.

## Usage

### As an Agent Skill

Ask the agent to migrate the project, for example *"migrate this Express app to TypeScript"* or
*"upgrade this app to Express 5"*: each tool loads the skill when the request matches its
description. To call it explicitly, type `/framework-migration` in Claude Code or Cursor, or
`$framework-migration` in Codex. [`SKILL.md`](skills/framework-migration/SKILL.md)
tells the agent how to pick a pack and run the staged workflow:

1. **Baseline** — clean git tree, inventory, findings, existing tests must pass.
2. **Stages from the pack** — dry-run each stage's codemods, read the diff, apply, then check
   type-check, tests (at baseline parity) and a smoke boot. One commit per stage
   (`migrate(<pack>): stage <n> <id>`), so every stage is a rollback point. A failed gate stops
   the migration.
3. **Report** — `MIGRATION_REPORT.md` with per-stage results, manual items (file:line and fix hint)
   and rollback commits.

The agent needs a shell with Node.js, npm and network access to run the engine; all three tools
provide one when running locally.

### The `fm` command

```bash
npx -p framework-migration-agent-skill fm --help
```

| Command | Purpose | Output (in `.fm/`) |
|---|---|---|
| `fm validate-pack <path>` | Validate a pack against the schemas | — |
| `fm detect-stack [dir]` | Detect language, framework and version from manifests; list matching packs | — |
| `fm inventory [dir]` | File and dependency graph, entry points, per-file risk | `inventory.json` |
| `fm detect --pack <id> [dir]` | Run a pack's rules | `findings.json` |
| `fm run-codemod --pack <id> --stage <id> --dry-run\|--apply [dir]` | Run a stage, dry-run first | `diffs/stage-N/*.patch` |
| `fm check --pack <id> --stage <n> [dir]` | Type-check, tests, lint, smoke boot against the baseline | `checks/stage-N.json` |
| `fm report --pack <id> [dir]` | Staged migration report | `MIGRATION_REPORT.md` (project root) |

Example, migrating an Express app by hand with the pilot pack:

```bash
fm detect-stack .
fm inventory . && fm detect --pack express-js-to-ts .
fm check --pack express-js-to-ts --stage 0 .            # baseline
fm run-codemod --pack express-js-to-ts --stage tooling --dry-run .
fm run-codemod --pack express-js-to-ts --stage tooling --apply .
fm check --pack express-js-to-ts --stage 1 .
git commit -am "migrate(express-js-to-ts): stage 1 tooling"
# ... repeat for each stage in pack.yaml ...
fm report --pack express-js-to-ts .
```

## Packs

Tier 1 = automated, 2 = partially automated, 3 = assist mode (inventory, findings, roadmap).

| Pack | From → To | Tier | Status |
|---|---|---|---|
| [`express-js-to-ts`](skills/framework-migration/packs/express-js-to-ts) | Express JS → Express TS | 1 | shipped (pilot) |
| [`express-4-to-5`](skills/framework-migration/packs/express-4-to-5) | Express 4 → 5 | 1 | shipped |
| [`node-cjs-to-esm`](skills/framework-migration/packs/node-cjs-to-esm) | CommonJS → ESM | 1 | shipped |
| [`eslint-flat-config`](skills/framework-migration/packs/eslint-flat-config) | legacy `.eslintrc` → flat config | 1 | shipped |
| [`react-major-upgrade`](skills/framework-migration/packs/react-major-upgrade) | React 17 → 18 → 19 | 1 | shipped |
| `nextjs-major-upgrade` | Next.js majors; Pages → App Router | 1 | planned |
| `angular-major-upgrade` | Angular majors | 1 | planned |
| `svelte-4-to-5` | Svelte 4 → 5 | 1 | planned |
| [`tailwind-3-to-4`](skills/framework-migration/packs/tailwind-3-to-4) | Tailwind v3 → v4 | 1 | shipped |
| `django-major-upgrade` | Django majors | 1 | planned |
| `pydantic-1-to-2` | Pydantic v1 → v2 | 1 | planned |
| `javax-to-jakarta` | Java EE → Jakarta EE | 1 | planned |
| `spring-boot-2-to-3` | Spring Boot 2 → 3 | 1 | planned |
| `java-lts-upgrade` | Java 8 → 11 → 17 → 21 | 1 | planned |
| `junit-4-to-5` | JUnit 4 → 5 | 1 | planned |
| `php-7-to-8` | PHP 7.x → 8.x | 1 | planned |
| `laravel-major-upgrade` | Laravel majors | 1 | planned |
| `flutter-dart-upgrade` | Flutter / Dart versions | 1 | planned |
| `jest-to-vitest` | Jest → Vitest | 2 | planned |
| `cra-webpack-to-vite` | Create React App / Webpack → Vite | 2 | planned |
| `moment-to-datefns` | Moment.js → date-fns / Day.js | 2 | planned |
| `react-class-to-hooks` | class components → hooks | 2 | planned |
| `redux-to-rtk` | classic Redux → Redux Toolkit | 2 | planned |
| `vue-2-to-3` | Vue 2 → 3 | 2 | planned |
| `nuxt-2-to-3` | Nuxt 2 → 3 | 2 | planned |
| `python-2-to-3` | Python 2 → 3 | 2 | planned |
| `sqlalchemy-1-to-2` | SQLAlchemy 1.x → 2.0 | 2 | planned |
| `pandas-1-to-2` | pandas 1.x → 2.x | 2 | planned |
| `dotnet-framework-to-dotnet` | .NET Framework → modern .NET | 2 | planned |
| `aspnet-mvc-to-core` | ASP.NET MVC → ASP.NET Core | 2 | planned |
| `xamarin-to-maui` | Xamarin.Forms → .NET MAUI | 2 | planned |
| `codeigniter-3-to-4` | CodeIgniter 3 → 4 | 2 | planned |
| `rails-major-upgrade` | Rails majors | 2 | planned |
| `react-native-upgrade` | React Native versions | 2 | planned |
| `go-api-updates` | Go module / API updates | 2 | planned |
| `express-to-nest` | Express → Fastify / NestJS | 3 | planned |
| `angularjs-to-angular` | AngularJS 1.x → Angular | 3 | planned |
| `jquery-to-vanilla` | jQuery → vanilla JS / React | 3 | planned |
| `backbone-ember-legacy` | Backbone / old Ember → modern | 3 | planned |
| `gatsby-to-next-astro` | Gatsby → Next.js / Astro | 3 | planned |
| `flask-to-fastapi` | Flask → FastAPI | 3 | planned |
| `struts-jsp-to-spring` | Struts / JSP → Spring MVC | 3 | planned |

## Development

```bash
npm install
```

Use npm 10 or newer for the install; npm 9 fails on this dependency tree (`npx npm@11 install` works
without upgrading your system npm).

```bash
npm run lint && npm run typecheck && npm test
```

Run the CLI from source with `npm run fm -- <command>`. `npm run evals` runs every shipped pack's
fixtures through the full pipeline and rewrites [`evals/scorecard.md`](evals/scorecard.md)
(`-- <pack-id>` for one pack, `-- --keep` to keep the work directory in `<tmpdir>/fm-evals`). CI
(`.github/workflows/evals.yml`) runs lint, typecheck, unit tests, the build and the evals.

New packs start from [`packs/_template/`](skills/framework-migration/packs/_template); a pack is
`shipped` only with verified `references/official-sources.md`, at least 3 positive and 1 negative
fixture, and passing evals. `npm run build` compiles it to `dist/`,
which is what the published package ships.

Design decisions and deviations from the plan are logged in [DECISIONS.md](DECISIONS.md).

## License

[MIT](LICENSE)
