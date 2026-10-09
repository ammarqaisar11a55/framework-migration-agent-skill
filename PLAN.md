# PLAN.md — framework-migration-agent-skill

> **Audience:** This file is written for Claude (the implementing agent).
> Read it fully before writing any code. Work milestone by milestone, in order.
> Repo: https://github.com/ammarqaisar11a55/framework-migration-agent-skill

---

## 0. Instructions to the implementing agent

1. **Work one milestone at a time.** Finish a milestone, satisfy its acceptance criteria, commit, then stop and summarize what was done before starting the next one (unless told to continue).
2. **Never invent tool names, CLI flags, or API behaviour.** Before writing a codemod config or a reference file for any framework, verify the official migration guide and tool usage from the project's official docs. Record every source URL in that pack's `references/official-sources.md`.
3. **Pin versions.** Every external tool a pack depends on gets an exact version in `pack.yaml`.
4. **Fixtures before codemods.** For each pack, write the `before/` and `after/` fixtures and tests first, then write the codemod until the eval passes.
5. **Never change business logic** in fixtures or in the skill's behaviour rules.
6. **Commit style:** Conventional Commits (`feat(engine): ...`, `feat(pack/express-js-to-ts): ...`, `test(fixtures): ...`, `docs: ...`). One logical change per commit.
7. If something in this plan is ambiguous or contradicts official docs, prefer the official docs, note the deviation in `DECISIONS.md`, and continue.

---

## 1. Purpose

Build an **Agent Skill** that gives an AI agent a structured, repeatable way to migrate an application from one framework (or major version) to another.

**Design principle:** one generic **migration engine** + many pluggable **migration packs**. Each pack covers exactly one `source → target` path. Adding a framework = adding a pack; the engine does not change.

**Key capabilities:**

| Capability | What it does | Output artifact |
|---|---|---|
| Migration inventory | Detects language, framework and version from manifests; builds file + dependency graph; finds entry points; scores risk per file | `inventory.json` |
| Deprecated API detection | Runs the pack's rule file (AST or regex) and tags each hit with severity and `auto_fixable` | `findings.json` |
| Codemod execution | Runs the official tool first, then pack codemods; always dry-run + diff before apply; leaf → root order | `diffs/stage-N/*.patch` |
| Compatibility checks | Compile/type-check, existing tests, lint, peer-dependency check, smoke boot — after every stage | `checks/stage-N.json` |
| Staged migration report | Per-stage summary, manual follow-ups, risks, rollback commit hashes | `MIGRATION_REPORT.md` |

---

## 2. Repository layout (target)

```
framework-migration-agent-skill/
├── README.md                         # what the skill is, install, usage, pack list
├── PLAN.md                           # this file
├── DECISIONS.md                      # deviations / design decisions log
├── package.json                      # engine is TypeScript (Node 20+)
├── tsconfig.json
├── skills/
│   └── framework-migration/
│       ├── SKILL.md                  # the skill entry point (frontmatter + workflow)
│       ├── engine/
│       │   ├── detect-stack.ts
│       │   ├── inventory.ts
│       │   ├── detect.ts
│       │   ├── run-codemod.ts
│       │   ├── check.ts
│       │   ├── report.ts
│       │   └── cli.ts                # `fm <command>` entry point
│       ├── adapters/
│       │   ├── node/  python/  jvm/  dotnet/  php/  ruby/  dart/  go/
│       ├── schemas/
│       │   ├── pack.schema.json
│       │   ├── rules.schema.json
│       │   ├── inventory.schema.json
│       │   └── findings.schema.json
│       └── packs/
│           ├── _template/
│           └── express-js-to-ts/     # pilot pack
│               ├── pack.yaml
│               ├── references/
│               │   ├── official-sources.md
│               │   ├── type-patterns.md
│               │   └── known-pitfalls.md
│               ├── rules/deprecated-apis.yaml
│               ├── codemods/
│               └── fixtures/
│                   └── <case>/{before,after,expected-report.md}
├── evals/
│   ├── run-evals.ts                  # runs every pack's fixtures, prints scorecard
│   └── scorecard.md                  # generated
└── .github/workflows/evals.yml       # CI: lint, typecheck, unit tests, evals
```

---

## 3. SKILL.md requirements

`skills/framework-migration/SKILL.md` must:

- Start with YAML frontmatter containing `name: framework-migration` and a `description` (one or two sentences) that says **when** to use the skill: migrating an app between frameworks or major versions, upgrading deprecated APIs, or producing a migration report.
- Explain how the agent picks a pack: run `detect-stack`, match against `pack.yaml` `from` fields, and fall back to **inventory + detection only** when no pack matches.
- Describe the standard staged workflow (section 5) and the agent rules (section 6) as direct instructions.
- Point to engine commands and pack references by relative path rather than inlining large content (keep SKILL.md concise; detail lives in `references/`).

---

## 4. Pack format

### 4.1 `pack.yaml` (validated by `schemas/pack.schema.json`)

```yaml
id: express-js-to-ts
title: Express (JavaScript) → Express (TypeScript)
ecosystem: node
tier: 1                       # 1 = automate, 2 = partial, 3 = assist mode
from: { framework: express, language: javascript, versions: "4.x" }
to:   { framework: express, language: typescript, versions: "4.x" }
tools:
  - { name: typescript, version: "<pin>" }
  - { name: jscodeshift, version: "<pin>" }
stages:
  - id: tooling
  - id: rename-and-modules
  - id: express-typing
  - id: strictness
  - id: cleanup
checks:
  typecheck: "npx tsc --noEmit"
  test: "npm test"
  lint: "npx eslint ."
  smoke: "node dist/server.js"   # plus a health-route probe
```

### 4.2 `rules/deprecated-apis.yaml` (validated by `schemas/rules.schema.json`)

Each rule: `id`, `description`, `matcher` (AST query or regex), `severity` (`info | warn | error`), `auto_fixable` (bool), `fix_hint`, `docs_url`.

### 4.3 Fixtures

- Minimum **3 positive + 1 negative** fixture per pack.
- Each `before/` is a small runnable app **with tests**.
- Negative fixtures contain patterns the agent must **flag but not change** (dynamic `require`, reflection, monkey-patching).

---

## 5. Standard staged workflow (every pack)

| Stage | Action | Gate (must pass to continue) |
|---|---|---|
| 0. Baseline | Clean git tree check, `detect-stack`, run existing tests, record pass rate | Baseline tests pass; otherwise stop and report |
| 1. Tooling & deps | Upgrade/add packages and config; enable shims (`allowJs`, `@vue/compat`, ngUpgrade hybrid) | App boots |
| 2. Automated codemods | Official tool first, then pack codemods, leaf → root | Compile + tests at baseline parity |
| 3. Rule-driven fixes | Fix only findings with `auto_fixable: true` | Compile + tests at baseline parity |
| 4. Hardening | Remove shims, enable strict modes, clear deprecation warnings | Compile + tests at baseline parity |
| 5. Report | Generate `MIGRATION_REPORT.md` | — |

## 6. Agent behaviour rules (copy into SKILL.md)

- One commit per stage, so each stage is a rollback point.
- Never proceed past a failed gate.
- Never change business logic.
- Tier 3 packs run in **assist mode**: inventory, findings, roadmap, and codemods only for mechanical parts.
- Always dry-run codemods and save the diff before applying.
- Anything not auto-fixable goes into the report as a manual item with file:line and a fix hint.

---

## 7. Migration pack catalog

All packs below are in scope for the project. They are built in the tier order of section 8. When building any pack, **verify tool names and current versions against official docs first** (rule 0.2).

### JavaScript / TypeScript — backend & tooling
| Pack id | From → To | Official tooling / references | Tier |
|---|---|---|---|
| `express-js-to-ts` **(pilot)** | Express JS → Express TS | TS handbook "Migrating from JavaScript", `@types/express` | 1 |
| `express-4-to-5` | Express 4 → 5 | Express migration guide, `@expressjs/codemod` | 1 |
| `node-cjs-to-esm` | CommonJS → ESM | Node ESM docs, custom jscodeshift | 1 |
| `eslint-flat-config` | legacy `.eslintrc` → flat config | `@eslint/migrate-config` | 1 |
| `jest-to-vitest` | Jest → Vitest | Vitest migration guide | 2 |
| `cra-webpack-to-vite` | Create React App / Webpack → Vite | Vite docs (CRA is deprecated) | 2 |
| `moment-to-datefns` | Moment.js → date-fns / Day.js | library docs, custom codemod | 2 |
| `express-to-nest` | Express → Fastify / NestJS | framework docs | 3 |

### Frontend frameworks
| Pack id | From → To | Official tooling / references | Tier |
|---|---|---|---|
| `react-major-upgrade` | React 17 → 18 → 19 | `react-codemod`, `types-react-codemod` | 1 |
| `nextjs-major-upgrade` | Next.js majors; Pages → App Router | `@next/codemod`, Next upgrade guides | 1 |
| `angular-major-upgrade` | Angular majors | `ng update` schematics, update.angular.dev | 1 |
| `svelte-4-to-5` | Svelte 4 → 5 (runes) | `npx sv migrate` | 1 |
| `tailwind-3-to-4` | Tailwind v3 → v4 | `@tailwindcss/upgrade` | 1 |
| `react-class-to-hooks` | class components → hooks | React docs, custom codemod | 2 |
| `redux-to-rtk` | classic Redux → Redux Toolkit | RTK migration guide | 2 |
| `vue-2-to-3` | Vue 2 → 3 | Vue migration guide, `@vue/compat` | 2 |
| `nuxt-2-to-3` | Nuxt 2 → 3 | Nuxt migration docs | 2 |
| `angularjs-to-angular` | AngularJS 1.x → Angular | ngUpgrade docs | 3 |
| `jquery-to-vanilla` | jQuery → vanilla JS / React | custom rules | 3 |
| `backbone-ember-legacy` | Backbone / old Ember → modern | Ember codemods; rewrite otherwise | 3 |
| `gatsby-to-next-astro` | Gatsby → Next.js / Astro | framework docs | 3 |

### Python
| Pack id | From → To | Official tooling / references | Tier |
|---|---|---|---|
| `django-major-upgrade` | Django majors | release notes, `django-upgrade` | 1 |
| `pydantic-1-to-2` | Pydantic v1 → v2 | `bump-pydantic` | 1 |
| `python-2-to-3` | Python 2 → 3 | `pyupgrade`, `modernize` (`2to3` removed from recent Python) | 2 |
| `sqlalchemy-1-to-2` | SQLAlchemy 1.x → 2.0 | SQLAlchemy 2.0 migration guide | 2 |
| `pandas-1-to-2` | pandas 1.x → 2.x | release notes | 2 |
| `flask-to-fastapi` | Flask → FastAPI | FastAPI docs, `libcst` | 3 |

### Java / JVM
| Pack id | From → To | Official tooling / references | Tier |
|---|---|---|---|
| `javax-to-jakarta` | Java EE → Jakarta EE | OpenRewrite, Eclipse Transformer | 1 |
| `spring-boot-2-to-3` | Spring Boot 2 → 3 | OpenRewrite Spring recipes, Spring guide | 1 |
| `java-lts-upgrade` | Java 8 → 11 → 17 → 21 | OpenRewrite Java recipes | 1 |
| `junit-4-to-5` | JUnit 4 → 5 | OpenRewrite recipes | 1 |
| `struts-jsp-to-spring` | Struts / JSP → Spring MVC | rewrite | 3 |

### .NET
| Pack id | From → To | Official tooling / references | Tier |
|---|---|---|---|
| `dotnet-framework-to-dotnet` | .NET Framework → modern .NET | Microsoft porting docs; verify current recommended upgrade tool | 2 |
| `aspnet-mvc-to-core` | ASP.NET MVC → ASP.NET Core | Microsoft migration docs | 2 |
| `xamarin-to-maui` | Xamarin.Forms → .NET MAUI | Microsoft MAUI migration docs | 2 |

### PHP / Ruby
| Pack id | From → To | Official tooling / references | Tier |
|---|---|---|---|
| `php-7-to-8` | PHP 7.x → 8.x | Rector | 1 |
| `laravel-major-upgrade` | Laravel majors | Laravel upgrade guides, Rector Laravel | 1 |
| `codeigniter-3-to-4` | CodeIgniter 3 → 4 | CodeIgniter upgrade docs | 2 |
| `rails-major-upgrade` | Rails majors | `rails app:update`, Rails upgrade guides | 2 |

### Mobile / other
| Pack id | From → To | Official tooling / references | Tier |
|---|---|---|---|
| `flutter-dart-upgrade` | Flutter / Dart versions | `dart fix`, Flutter breaking-change docs | 1 |
| `react-native-upgrade` | React Native versions | React Native Upgrade Helper | 2 |
| `go-api-updates` | Go module / API updates | `go fix`, release notes | 2 |

---

## 8. Milestones

Each milestone ends with a commit and a short summary. **Acceptance criteria are mandatory.**

### M1 — Repo scaffold
- `package.json`, `tsconfig.json`, ESLint, Vitest for the engine's own unit tests, `README.md` skeleton, `DECISIONS.md`.
- Folder layout from section 2 with placeholder files.
- **Accept:** `npm run lint`, `npm run typecheck`, `npm test` all pass on an empty engine.

### M2 — Schemas + pack template
- JSON Schemas for pack, rules, inventory, findings.
- `packs/_template/` with every required file and comments.
- A validator command: `fm validate-pack <path>`.
- **Accept:** template validates; a deliberately broken pack fails validation with a clear error.

### M3 — Engine: detect-stack + inventory
- `detect-stack` reads manifests for all ecosystems in section 7 (at minimum: `package.json`, `requirements.txt`/`pyproject.toml`, `pom.xml`/`build.gradle`, `*.csproj`, `composer.json`, `Gemfile`, `pubspec.yaml`, `go.mod`).
- `inventory` builds file list, dependency graph (Node first), entry points, risk score.
- **Accept:** unit tests with tiny sample manifests for every ecosystem; `inventory.json` validates against schema.

### M4 — Engine: detect + run-codemod
- Rule runner (regex + AST for JS/TS via a parser such as Babel or ts-morph).
- Codemod runner with `--dry-run` (writes patch) and `--apply`; leaf → root ordering from the dependency graph.
- Adapter interface so other ecosystems can plug in external tools (OpenRewrite, Rector, libcst, dart fix, etc.).
- **Accept:** unit tests for rule matching and dry-run patch output.

### M5 — Engine: check + report
- Check runner executes `pack.yaml` `checks`, captures pass/fail and counts, compares against baseline.
- Report generator writes `MIGRATION_REPORT.md` (stages, diffs summary, manual items, rollback hashes).
- **Accept:** report generated from mocked check data matches a snapshot.

### M6 — Pilot pack: `express-js-to-ts`
- References (verified sources), rules, codemods (`cjs-to-esm`, `add-handler-types`, rename), 5 fixtures:
  `01-basic-routes`, `02-middleware-chain`, `03-error-handler`, `04-mixed-cjs-esm`, `05-dynamic-require` (negative).
- **Accept:** all 5 fixtures pass the eval criteria in section 9.

### M7 — SKILL.md + evals + CI
- Final `SKILL.md` (section 3, section 6 rules).
- `evals/run-evals.ts` produces `scorecard.md`.
- GitHub Actions workflow runs lint, typecheck, unit tests, evals.
- **Accept:** CI green; scorecard shows 100% for the pilot.

### M8 — Real-repo trial
- Run the skill end to end on a small open-source Express JS repo (cloned into a temp dir, not committed).
- Record outcome and lessons in `DECISIONS.md`; fix any engine issues found.
- **Accept:** trial produces a complete `MIGRATION_REPORT.md` with no unhandled engine errors.

### M9+ — Pack expansion (one pack per PR)
Order: remaining **Tier 1 JS/TS** → Python/JVM/PHP/Dart **adapters + Tier 1 packs** → **Tier 2** packs → **Tier 3** assist-mode packs.
- Each new ecosystem first gets its adapter (with container image if the runtime is not Node).
- **Accept per pack:** schema-valid `pack.yaml`, verified `official-sources.md`, ≥3 positive + 1 negative fixtures, passing evals, row added to the README pack list.

---

## 9. Evaluation criteria (per fixture)

1. Migrated output compiles / type-checks cleanly.
2. Test pass rate equals the `before/` baseline.
3. `findings.json` matches `expected-report.md` (precision and recall reported).
4. Negative-case patterns are flagged and **left unchanged**.

Scorecard columns: pack, fixtures, compile pass %, test parity %, finding precision, finding recall, manual items.

---

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Codemods break edge cases | Dry-run + diff first; negative fixtures in every pack |
| Weak test suites make "pass" meaningless | Baseline stage warns on low coverage |
| Official tools change between versions | Pin versions in `pack.yaml`; re-verify references on update |
| Scope explosion across ecosystems | Strict tiering; Tier 3 stays assist mode |
| Non-Node runtimes (Java, .NET, PHP, Ruby, Dart) | Each adapter runs its tools in its own container image |

---

## 11. Definition of done (v1.0)

- M1–M8 complete, CI green.
- All Tier 1 packs shipped with passing evals.
- README lists every pack with tier and status (`shipped`, `in progress`, `planned`).
