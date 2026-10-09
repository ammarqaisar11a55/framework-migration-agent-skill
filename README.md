# framework-migration-agent-skill

An [Agent Skill](skills/framework-migration/SKILL.md) that gives an AI agent a structured, repeatable
way to migrate an application from one framework (or major version) to another.

One generic **migration engine** plus pluggable **migration packs**. Each pack covers exactly one
`source → target` path; adding a framework means adding a pack, not changing the engine.

> **Status:** early scaffold (milestone M1 of [PLAN.md](PLAN.md)). The `fm` commands are declared
> but not implemented yet, and no pack has shipped.

## Install

Requires Node.js 20.19 or newer.

```bash
npm install --save-dev framework-migration-agent-skill
```

The package contains the skill (`skills/framework-migration/SKILL.md`, schemas and packs) and the
`fm` command-line tool the skill drives.

## Usage

```bash
npx fm --help
```

| Command | Purpose | Output |
|---|---|---|
| `fm validate-pack <path>` | Validate a pack against the schemas | — |
| `fm detect-stack` | Detect language, framework and version from manifests | — |
| `fm inventory` | File and dependency graph, entry points, per-file risk | `inventory.json` |
| `fm detect` | Run a pack's deprecated-API rules | `findings.json` |
| `fm run-codemod` | Run codemods, dry-run first | `diffs/stage-N/*.patch` |
| `fm check` | Type-check, tests, lint, smoke boot against the baseline | `checks/stage-N.json` |
| `fm report` | Staged migration report | `MIGRATION_REPORT.md` |

## Packs

Tier 1 = automated, 2 = partially automated, 3 = assist mode (inventory, findings, roadmap).

| Pack | From → To | Tier | Status |
|---|---|---|---|
| `express-js-to-ts` | Express JS → Express TS | 1 | planned (pilot) |
| `express-4-to-5` | Express 4 → 5 | 1 | planned |
| `node-cjs-to-esm` | CommonJS → ESM | 1 | planned |
| `eslint-flat-config` | legacy `.eslintrc` → flat config | 1 | planned |
| `react-major-upgrade` | React 17 → 18 → 19 | 1 | planned |
| `nextjs-major-upgrade` | Next.js majors; Pages → App Router | 1 | planned |
| `angular-major-upgrade` | Angular majors | 1 | planned |
| `svelte-4-to-5` | Svelte 4 → 5 | 1 | planned |
| `tailwind-3-to-4` | Tailwind v3 → v4 | 1 | planned |
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

Run the CLI from source with `npm run fm -- <command>`. `npm run build` compiles it to `dist/`,
which is what the published package ships.

Design decisions and deviations from the plan are logged in [DECISIONS.md](DECISIONS.md).

## License

[MIT](LICENSE)
