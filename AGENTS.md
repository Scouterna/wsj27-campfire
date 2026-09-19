# AGENTS.md

How to work in the WSJ27 Campfire repository. `CLAUDE.md` is a symlink to this file. Read `README.md` for what the project is; this file is about how to work in it.

The specifics live beside what they govern, and you are expected to read them before you write:

| Before you write           | Read                                                         |
| -------------------------- | ------------------------------------------------------------ |
| The web application        | [`apps/web/AGENTS.md`](apps/web/AGENTS.md)                   |
| Swift                      | [`apps/apple/AGENTS.md`](apps/apple/AGENTS.md)               |
| Kotlin                     | [`apps/android/AGENTS.md`](apps/android/AGENTS.md)           |
| A feature module           | [`modules/AGENTS.md`](modules/AGENTS.md)                     |
| A shared library           | [`libraries/AGENTS.md`](libraries/AGENTS.md)                 |
| The mock back-end          | [`tools/mock/AGENTS.md`](tools/mock/AGENTS.md)               |
| A guidebook page or an ADR | [`docs/AGENTS.md`](docs/AGENTS.md)                           |
| Structurizr DSL            | [`docs/architecture/AGENTS.md`](docs/architecture/AGENTS.md) |

## Project

WSJ27 Campfire is a monorepo for a digital companion for the leaders and the contingent management team of Scouterna's Swedish contingent to the World Scout Jamboree 2027. The front-end lives here: one React web application and the two thin native shells that host it. The back-end services do not – they are Python, one repository per service, built and deployed on their own.

The [software guidebook](docs/guidebook/index.md) and the [decisions](docs/decisions/index.md) are the source of truth for how the system is put together. Read them rather than inferring, and prefer asking over guessing. The [architecture model](docs/architecture/AGENTS.md) is the same system as C4 diagrams, and every diagram in the guidebook is rendered from it.

The feature set beyond the first feature is still genuinely open. Say what is undecided rather than inventing it.

The tree carries the first version's web application: the router, the query cache and its IndexedDB persistence, ScoutID sign-in, and the participants feature whole – the list, the detail, the unit browser, and the home widgets. The two shells still hold a trivial screen each, and the bridge between them and the web application is design, not code. Where the guidebook and the tree disagree, read the code for what exists and the guidebook for the version the code is becoming.

The pnpm layer is the web application, the modules, the libraries, the tools, and the shared checks. The shells build with Gradle and Xcode, which the root scripts drive and pnpm does not manage.

Foundations that are set:

- **Package manager:** pnpm, pinned by `packageManager` in `package.json`
- **Language:** TypeScript, ESM (`"type": "module"`)
- **Runtime:** Node.js 24+, pinned in `.tool-versions`
- **Front-end:** one React web application in `apps/web`, built with Vite and hosted on phones by the native shells in `apps/android` and `apps/apple`
- **Back-end:** Python services in their own repositories, running as containers on Kubernetes in Azure
- **Formatting:** Prettier, configured in `config/prettier/` – it formats the Android XML too, through `@prettier/plugin-xml`; Swift, Kotlin, shell, and SVG are ignored there and owned by their own tools
- **Linting:** ESLint, configured in the root `eslint.config.ts` – flat config expresses per-path rules directly, so there is no `config/eslint/`
- **Kotlin:** ktlint, reading its rules from the root `.editorconfig`, and Detekt, configured in `config/detekt/`
- **Swift:** SwiftFormat and SwiftLint, configured in `config/swiftformat/` and `config/swiftlint/`
- **Markdown:** markdownlint, configured in `config/markdownlint/`
- **Commit messages:** commitlint, configured in `config/commitlint/`
- **Guidebook:** VitePress, configured in `config/vitepress/`

Two things about dependencies that will otherwise surprise you:

- Versions are pinned exactly and refused until a release is three days old, so a version published this week may simply not install. Adding a dependency is a deliberate act – raise it rather than doing it in passing.
- TypeScript stays on 6.x. `typescript-eslint` needs the JavaScript compiler API for its type-aware rules and does not accept 7, and `strictPeerDependencies` makes that a failed install rather than a warning. Everything moves to 7 in one step once it is supported, so one compiler decides what the types are.

## The map

This file holds the rules that apply everywhere. Everything else is written down somewhere specific, and the fastest way to be wrong here is to guess at something the guidebook already answers.

| Question                                | Where it is answered                                                                               |
| --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| What Campfire is and who it is for      | [`README.md`](README.md), then the [guidebook's Introduction](docs/guidebook/index.md)             |
| Who uses it, and what it depends on     | [Context](docs/guidebook/context/index.md)                                                         |
| What it has to do, and hold to          | [Requirements](docs/guidebook/requirements/index.md)                                               |
| How the code is shaped                  | [Architecture](docs/guidebook/architecture/index.md), and ADRs 014–018                             |
| How it looks and behaves                | [Design](docs/guidebook/design/index.md), and Storybook on port 3002                               |
| How the system is drawn                 | [`docs/architecture/`](docs/architecture/AGENTS.md) – one C4 model, every diagram rendered from it |
| How to set up, run, and check           | [Development](docs/guidebook/development/index.md), plus the script table below                    |
| What is tested, and how                 | [Testing](docs/guidebook/testing/index.md)                                                         |
| How it is versioned, released, and run  | [Maintenance](docs/guidebook/maintenance/index.md), and [Versioning](#versioning) below            |
| How work moves from an idea to a commit | [Process](docs/guidebook/process/index.md), and [Agents](#agents) below                            |
| Why something is the way it is          | [The decision log](docs/decisions/index.md)                                                        |
| What a word means                       | [Glossary](docs/guidebook/glossary/index.md)                                                       |

The guidebook describes the first version as built, so it runs ahead of the tree without saying where. Read the code for what exists.

## Working in the repository

`pnpm install` is the only setup step. It installs dependencies and points git at `.githooks`.

| Script                      | What it does                                                        |
| --------------------------- | ------------------------------------------------------------------- |
| `pnpm build:android:dev`    | Assembles the Android shell against campfire.wsj27.scouterna.net    |
| `pnpm build:android:prod`   | Assembles the Android shell against campfire.wsj27.se               |
| `pnpm build:apple:dev`      | Builds the Apple shell against campfire.wsj27.scouterna.net         |
| `pnpm build:apple:prod`     | Builds the Apple shell against campfire.wsj27.se                    |
| `pnpm build:arch`           | Exports the architecture diagrams as SVGs                           |
| `pnpm build:guidebook`      | Builds the guidebook into `.build/docs`                             |
| `pnpm build:image`          | Packages the built web application as a linux/amd64 Caddy image     |
| `pnpm build:storybook`      | Builds Storybook into `.build/storybook`                            |
| `pnpm build:web`            | Builds the web application into `apps/web/.build`                   |
| `pnpm check:android:format` | ktlint, in check mode                                               |
| `pnpm check:android:lint`   | Detekt and Android Lint                                             |
| `pnpm check:apple:format`   | SwiftFormat, in lint mode                                           |
| `pnpm check:apple:lint`     | SwiftLint, with `--strict`                                          |
| `pnpm check:arch`           | Validates and inspects the architecture model                       |
| `pnpm check:format`         | Prettier, in check mode                                             |
| `pnpm check:lint`           | ESLint, with `--max-warnings 0`                                     |
| `pnpm check:markdown`       | markdownlint                                                        |
| `pnpm check:types`          | `tsc --noEmit`                                                      |
| `pnpm clean`                | Removes every `.build`, and Gradle's working directories            |
| `pnpm format`               | Prettier, writing fixes                                             |
| `pnpm format:android`       | ktlint, writing fixes                                               |
| `pnpm format:apple`         | SwiftFormat, writing fixes                                          |
| `pnpm format:svg`           | svgo, rewriting the web and guidebook icons in place                |
| `pnpm generate:apple`       | XcodeGen, regenerating `Campfire.xcodeproj` from `project.yml`      |
| `pnpm ide:android`          | Opens `apps/android` in Android Studio                              |
| `pnpm ide:apple`            | Opens `Campfire.xcodeproj` in Xcode                                 |
| `pnpm prepare`              | Points git at `.githooks` – runs as part of `pnpm install`          |
| `pnpm start:android`        | Boots an emulator and launches the Android shell against :8000      |
| `pnpm start:apple`          | Boots a Simulator and launches the Apple shell against :8000        |
| `pnpm start:arch`           | Structurizr, to arrange the diagrams, on port 3003                  |
| `pnpm start:dev`            | The dev environment: the real back-end in containers, on :8000      |
| `pnpm start:guidebook`      | The guidebook's dev server, on port 3001                            |
| `pnpm start:local`          | The local environment: the mock back-end, on :8000                  |
| `pnpm start:mock`           | The mock back-end alone, on port 8003                               |
| `pnpm start:prod`           | The prod environment: the built image, on :8000                     |
| `pnpm start:storybook`      | Storybook – every component, widget, and screen – on port 3002      |
| `pnpm start:web`            | The web application's dev server alone, on port 3000                |
| `pnpm test`                 | The TypeScript tests, across every package that has them            |
| `pnpm test:android`         | The Android JVM unit tests, plus the instrumented compile           |
| `pnpm test:android:ui`      | The Android instrumented tests, on an emulator                      |
| `pnpm test:apple`           | The Apple unit tests, on a Simulator                                |
| `pnpm test:apple:ui`        | The Apple UI tests, on a Simulator                                  |
| `pnpm test:web:ui`          | The Playwright walks – starts a dev server, or reuses a running one |

Campfire has three environments – **local**, **dev**, and **prod** – and they differ in one thing: what sits behind the back-end paths. All three serve the same origin, `http://localhost:8000`, so the web application and the shells never know which is running. `pnpm start:local` puts the mock there, `pnpm start:dev` the real back-end in containers, and `pnpm start:prod` the same back-end with the built image serving the web. `start:android` and `start:apple` always point at that origin, so the environment is a property of the stack rather than of the build – the shells' dev and prod flavors exist for `build:android:dev` and the rest, which bake a remote origin into a shipped artifact.

`start:local`, `start:dev`, and `start:prod` bring up a whole environment; every other `start:` script runs one thing – a single server, or a shell. Ports are coordinated by hand and written down rather than left to a default, so two servers can run at once without one silently taking the other's port. `start:web`, `start:mock`, `start:storybook`, and `start:guidebook` each go through `scripts/start/server.sh`, and the environments through `scripts/start/local.sh` and `scripts/start/dev.sh` – `start:prod` is `scripts/start/prod.sh`, a wrapper that hands `dev.sh` the prod folder. All of them free the port first and name what they stopped, report a server only once it answers, and stop everything they started on Ctrl+C. Noticing that one process died and stopping the rest belongs to the process-group scripts, `server.sh` and `local.sh`; `dev.sh` starts containers rather than processes and leaves them to compose. `scripts/start/helpers.sh` holds the shared pieces. The shells' own start scripts under `scripts/android/` and `scripts/apple/` start no server – they check that something already answers on :8000 and say what to start when nothing does.

Storybook, configured in `config/storybook/`, indexes every `*.stories.tsx` under `libraries/ui` and `modules/*`, plus the `*.mdx` pages in `libraries/ui`, so one instance holds a component and a whole screen ([ADR 023](docs/decisions/023-catalog-the-ui-in-storybook.md)). Five conventions hold there:

- A component's stories sit beside it as `Name.stories.tsx`, and its layout classes come from `libraries/ui/src/storybook/stories.css` rather than from a `style` prop.
- The sidebar runs `Introduction`, `Foundations`, `Components`, then `Modules/<Module>/…`, in that order rather than alphabetically – `storySort` in `config/storybook/preview.tsx` sets it, and a new story's title joins one of those four.
- Every story renders in a unit theme and inside a router. `ThemeDecorator` wraps each one in the color the toolbar picked, all five of which the catalog has to hold up in, and `RouterDecorator` is to let anything that links render outside the application.
- Storybook is themed like the guidebook. `config/storybook/theme.ts` gives the manager and the Docs pages the guidebook's own look, so the catalog and the guidebook read as one project – keep a change to one in step with the other. Today only the guidebook is published: `release_guidebook.yml` puts it on GitHub Pages, while Storybook is built in `build_web.yml` and hosted nowhere.
- Nothing in Storybook touches a network, and its telemetry is off. A story that needs data stubs it in the story.

Each module's Playwright walk-throughs live in `modules/<name>/test-ui` and run as that module's own project ([ADR 024](docs/decisions/024-walk-through-the-web-application-per-module-with-playwright.md)) – `pnpm test:web:ui --project=participants`. The module list is written twice, in `config/playwright/playwright.config.ts` and in the `module` matrix in `.github/workflows/test_web.yml`; a module added to one and not the other either runs nowhere or fails outright.

**Before handing work back, run `pnpm test` and the four checks** – `check:format`, `check:lint`, `check:markdown`, `check:types` – as separate commands, and the checks and tests for every platform you touched. There is no script that runs them together, on purpose: run separately, one pass reports every failure instead of stopping at the first. `pnpm format` repairs formatting; lint and Markdown findings are fixed by hand.

The four cover only the shared toolchain. Work that touched a shell also runs its platform's checks and tests: `check:android:format`, `check:android:lint`, and `test:android` for Kotlin, or `check:apple:format`, `check:apple:lint`, and `test:apple` for Swift.

The same checks run in GitHub Actions from `.github/workflows/` ([Continuous integration](docs/guidebook/development/continuous-integration.md)), as separate steps so one run reports every failure. Two git hooks run locally:

- **`commit-msg`** holds the subject to the [commit message rules](#commit-messages).
- **`pre-push`** runs the four checks and `pnpm test`, then the Kotlin and Swift checks and tests where their toolchains are installed – a missing toolchain is skipped out loud rather than in silence. It stops at the first failure rather than reporting everything, because the work is not leaving the machine either way – run the checks yourself for the complete list.

## Repository layout

- `apps/` – the deployable apps: `web` (the React application), `apple`, and `android` (the shells that host it)
- `libraries/` – generic, reusable packages: `host` (which tier the application runs in), `ui` (the design system), `utils`
- `modules/` – feature modules, each a domain capability: `authentication`, `home`, `journey`, `participants`
- `tools/` – development tooling that ships to nobody: `mock`, the back-end stand-in behind `pnpm start:mock`
- `config/` – shared tooling configuration, one directory per tool, plus `environments/local|dev|prod` for the three ways Campfire runs
- `scripts/` – every script the `pnpm` scripts run: the start scripts under `start/`, the shells' own under `android/` and `apple/`, and the Structurizr runner under `structurizr/`
- `docs/` – the decision log, the software guidebook, and the C4 architecture model
- `.agents/` – the agent definitions, the skills, and the per-branch spec scratch
- `.githooks/` – the git hooks `pnpm install` wires up
- `.github/` – issue templates, the pull request template, and the workflows

Packages are named `@scouterna/wsj27-campfire-<name>`, and `apps/*`, `libraries/*`, `modules/*`, and `tools/*` are the four pnpm workspace roots. Every workspace package exports raw TypeScript source, so nothing under `libraries/` or `modules/` has a build step of its own – Vite compiles them together with the app. `apps/apple` and `apps/android` are native projects with no `package.json`, driven by the root scripts.

## Code organization

- A package's public surface is its `src/index.ts`, and nothing else in it is imported from outside. A module exports the screens and widgets the application mounts; a library exports what any module may reach for.
- Sort independent declarations alphabetically by identifier – exports in an index, object keys, union members, props.
- Keep declarations together when their relationship decides their order: a component with its props type, a public function with its private helpers, closely coupled state. Comment that order only when it is not self-evident.
- A component is a file named after it, in PascalCase, with its stylesheet and its stories beside it – `Logo.tsx`, `Logo.css`, `Logo.stories.tsx`, in a directory of its own. Everything else is kebab-case; `unicorn/filename-case` allows those two and nothing else.
- A component takes one `props` object typed as a `XxxProps` type declared beside it and exported with it, every field `readonly` and every field documented.

## Comments

- A comment earns its place by saying something the code cannot – why a rule is switched off, why a value is pinned, what breaks without it.
- Every export gets a JSDoc block, and `jsdoc/require-jsdoc` enforces it. One sentence saying what the declaration is, does, returns, or creates is usually the whole comment, with a description on every `@param` and `@returns`. A story is the exception: its name and its rendered output are its description.
- A type comment says what the abstraction represents; a member comment says what that operation does – never one restated as the other. Leave out what the names and types already say.
- Document a library's public surface as a contract: parameter constraints, return cases that mean different things, errors a caller handles differently, side effects, invariants, lifecycle. Leave out ordinary failures.
- Inside a function, comment only a non-obvious constraint, invariant, decision, or consequence – an architectural boundary, who owns a piece of state, an ordering requirement. Prefer clearer code to a comment narrating it, and put the comment beside what it explains.
- Concise means dropping redundancy, not context. Before deleting a comment, ask whether a shorter wording keeps what the code cannot express.
- A comment describes the code as it is now – no deleted code, earlier commits, migrations, a dependency that was removed, or an approach that was tried and rejected. A reader cannot act on any of it, and it outlives the memory of why it was written; that history goes in the commit message, or in an ADR when the choice was significant. No parked tasks, questions, or unexplained workarounds either; those go in an issue.

## Architecture and decisions

Campfire is built on decisions made explicitly and written down, so the reasoning stays understandable over time. Significant decisions are recorded as ADRs under [`docs/decisions/`](docs/decisions/index.md) – [ADR 001](docs/decisions/001-record-architecture-decisions.md) through [ADR 032](docs/decisions/032-hold-the-signed-in-person-in-utils.md) so far, so the next record is 033; the system is described in the [guidebook](docs/guidebook/index.md); the C4 model lives in [`docs/architecture/`](docs/architecture/AGENTS.md).

- Read the decisions and the guidebook before a change that touches architecture.
- Record a significant decision as a new ADR – context, choice, consequences, alternatives. Copy `docs/decisions/template.md`, take the next number, add a row to the index. Never renumber.
- Until an ADR is pushed, it can be rewritten – while the work is still on this machine, a record moves with the code it describes. Once pushed, an accepted ADR is never rewritten: a decision that changes is superseded by a new one, and a recorded one is never silently contradicted.
- The guidebook is the opposite: a living description, rewritten to say how the system is _now_. A change to how something works is not done until the page that describes it says so.
- The architecture model is edited as DSL and arranged in Structurizr's browser UI. Only the browser writes a layout, so a model change means a `pnpm start:arch` session before `pnpm build:arch`. Read `docs/architecture/AGENTS.md` first.
- **An agent never writes `docs/architecture/workspace.json` directly, under any circumstance** – not by hand, not by scripting a merge of old and freshly exported JSON. It holds the maintainer's manual layout, and any agent-written version destroys that work. After a DSL edit, stop and ask the maintainer to run `pnpm start:arch` and arrange the affected views; do not attempt a workaround that touches the file yourself.

## Where agent material lives

Everything an agent reads lives under **`.agents/`** – the agent definitions in `.agents/agents/`, the skills in `.agents/skills/`, and the per-branch spec scratch in `.agents/specs/`. The material is prose with a little frontmatter, and any harness can read it.

Each harness looks for that material somewhere else, so a symlink points it there rather than a copy. Claude Code reads `.claude/agents` and `.claude/skills`; GitHub Copilot reads `.github/agents/<name>.agent.md`, so each agent has a symlink under that name too:

```text
.agents/agents/analyst.md          # the real file
.claude/agents                  -> ../.agents/agents
.claude/skills                  -> ../.agents/skills
.github/agents/analyst.agent.md -> ../../.agents/agents/analyst.md
```

The same rule explains `CLAUDE.md`, which is a symlink to `AGENTS.md`: the instructions are for any agent, and only the filename is Claude's. Every per-area `AGENTS.md` carries the same symlink beside it, made the same way – `ln -s AGENTS.md CLAUDE.md`, relative, so it survives being cloned anywhere.

Keeping the definitions portable is a constraint on what goes in them. An agent's frontmatter carries `name` and `description` and nothing else – a `tools` list or a `skills` list is Claude Code's own extension, and a harness that does not know the key either ignores it or fails on it. An agent that needs a skill says so in its prose and loads it there.

markdownlint follows a symlinked directory, so every symlink above is in the `ignores` list in `config/markdownlint/markdownlint-cli2.jsonc` and the real files are linted once at their real paths. Prettier refuses a symlink outright and needs no entry.

## Agents

Four agents in `.agents/agents/` carry work from a need to reviewed code, with a human gate between each: **`analyst`** (the issue, then requirements, then reconciliation), **`architect`** (design, ADRs, guidebook), **`developer`** (plan, then implementation), **`reviewer`** (findings, then a file-by-file walkthrough). Their own definitions hold the detail, and the human drives every step – the agents propose, the human approves.

Seven steps, each with one named output, so what "done" means is never in doubt:

| Step      | Agent       | Output                                                                      |
| --------- | ----------- | --------------------------------------------------------------------------- |
| Capture   | `analyst`   | A GitHub issue – lean, and tracked                                          |
| Detail    | `analyst`   | `requirements.md` – numbered requirements with testable acceptance criteria |
| Design    | `architect` | `design.md`, plus any ADRs and guidebook updates the decisions call for     |
| Plan      | `developer` | `plan.md` – tasks traced to requirements, with checkpoints                  |
| Build     | `developer` | The code and its tests, left in the working tree                            |
| Review    | `reviewer`  | The findings, and a file-by-file walkthrough before committing              |
| Reconcile | `analyst`   | The issue updated to match what was actually built                          |

- Requirements, design, and plan are working scratch in `.agents/specs/<branch>/`, gitignored, where `<branch>` is the branch name with `/` replaced by `-` – `feature/7-status-reporting` becomes `.agents/specs/feature-7-status-reporting/`, the same whether or not you work in a worktree. The durable record is the issue, the ADRs, the guidebook, and the code.
- Requirements are numbered so the design and the plan trace back to them – `Requirements: 2.1`.
- Not every issue needs the full flow – a one-line task or a clear bug can go straight to a small change.
- Agents never create branches, never commit, and never change the working context – the tree the work started in is the tree it ends in.
- An agent may fan genuinely independent work out to subagents of its own type, writing the results back itself ([ADR 031](docs/decisions/031-adopt-the-agent-driven-working-process.md)).

## Agent skills

Reusable domain knowledge lives as skills under `.agents/skills/<name>/` – each a `SKILL.md` plus reference files. Load the ones the work touches.

- `knowing-wsj27` captures the WSJ27 domain – the official jamboree and the Swedish contingent – so an agent starts from accurate context instead of guessing.
- `writing-markdown` covers the Markdown this repository accepts: the house conventions, the quirks Prettier and markdownlint impose, and the VitePress syntax the guidebook adds on top.
- A skill's frontmatter `name` matches its directory, and its `metadata.version` is a quoted `major.minor` string. **Bumping it is what publishes the skill:** `release_skills.yml` packages it as a GitHub Release tagged `<name>-v<version>`, and an unchanged version is skipped because its tag already exists. A change without a bump would silently never ship, so `check_skills.yml` fails a pull request that edits a skill and leaves its version alone.
- A published skill is used two ways: read directly by agents working in the repository, and uploaded to Claude.ai and the Claude apps (Settings > Features) as an installable Skill for people.

## Language and writing

These rules apply to all text in the repository – documentation, comments, commit messages, issues, and pull requests.

- American English always – "color", "organize", "behavior".
- Use en-dash (–) only – never em-dash (—), and never a hyphen for breaks or ranges. "2026–2027", "early – on purpose".
- Use the Oxford comma. Write "front-end" and "back-end" hyphenated.
- No corporate language – never "leverage", "synergy", "deliver solutions", or calling people "resources".
- Be direct and concrete. Short sentences beat long ones. Say what something is, not what it "aims to enable".

Markdown, on top of that:

- A blank line before every list – after headings, paragraphs, or bold text.
- ATX headings only, one H1 per document, no skipped levels.
- Fenced code blocks only, always with a language identifier.
- Descriptive link text, and alt text on every image.

## Issues and labels

Work is tracked as GitHub issues, created from the templates in `.github/ISSUE_TEMPLATE/`. Blank issues are switched off, so every issue arrives in one of three shapes. The `analyst` agent drafts and creates well-formed issues – see [Agents](#agents) for how they fit the wider workflow.

- **Type** – every issue is a **feature** (a capability to build), a **bug** (something that does not work), or a **task** (a chore that is neither). The template applies the matching label – `feature.yml` applies `feature`, `bug.yml` applies `bug`, `task.yml` applies `task` – so the type and the label are one fact.
- **Audience** – a feature and a bug both name who they are for, from the same nine people the architecture model draws: Leaders; CMT – Administration, Communication, Health, IST support, Program, Unit support, and Head of Contingent; and Developers. `feature.yml` and `bug.yml` list them in those words, so an issue, a diagram, and the guidebook name one set of groups rather than three overlapping ones. The dropdown is the whole of it – nothing turns an audience into a label.
- **Component** – `component:*` labels mark the areas an issue touches: the apps (`component:web`, `component:android`, `component:apple`), one per module (`component:authentication`, `component:home`, `component:journey`, `component:participants`), and the cross-cutting `component:config`, `component:docs`, and `component:agents`. No template applies one, so they go on by hand or with `gh issue edit`. Apply all that apply.

There are no milestones and no project board. An issue is created, fixed, and released, and the type and component labels are how work is filtered.

The label set grows with the project, and `gh issue create` fails outright on a label the repository does not have. Read it live rather than from this file:

```sh
gh label list
```

## Git workflow

- NEVER commit unless explicitly asked – do not offer or suggest it.
- NEVER push; the maintainer handles all pushing.
- NEVER create GitHub issues, pull requests, or comments unless explicitly asked.
- Never add AI attribution – no assistant co-author trailers, no "generated by" footers.
- Every change should be tracked by a GitHub issue. Branches are `<type>/<issue>-<slug>`, for example `feature/12-status-reporting`.
- All changes go through pull requests, merged by rebasing.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/), enforced by the `commit-msg` hook: `<type>: <description>`, optionally a blank line and a body.

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Do not use a scope. `feat(auth): …` is valid Conventional Commits and is rejected here.
- Subject: imperative, lowercase first word, no trailing period. Aim for 50 characters; 72 is the ceiling.
- Body: most commits have one. Explain why, not how, and never every detail the diff already shows. At most three `-` bullets, each a brief sentence or two, wrapped at about 72 characters with continuation lines indented two spaces, and a blank line between bullets. 100 characters is the enforced ceiling on a line. Reasoning that belongs beside the code goes in a comment instead, where it stays true.
- Breaking change: `!` after the type – `feat!: …`.

A trivial change needs only a subject:

```text
feat: add daily unit status report
```

Anything else says why, briefly:

```text
docs: record the back-end direction as an ADR

- Python services in their own repositories, on Kubernetes in Azure;
  frameworks and data stores stay open until the first service needs
  them, so nothing is invented ahead of the need.
```

## Versioning

The version in `package.json` is `2026.7.1`. The project uses [Calendar Versioning (CalVer)](https://calver.org/) with the shape `YEAR.FEATURE.PATCH`:

- `2026` – the year of the feature release. The first feature release in a new year adopts that year; a patch release stays on the year of the feature it patches and never advances it.
- `1` – the feature release, bumped for a `feat`.
- `0` – the patch, bumped for a `fix`.

Commit types drive the bump: `feat` moves the feature segment, `fix` moves the patch segment, and the other types (`chore`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`) do not change the version.
