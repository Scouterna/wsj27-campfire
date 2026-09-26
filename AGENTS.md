# AGENTS.md

How to work in the WSJ27 Campfire repository. Read `README.md` for what the project is; this file is about how to work in it.

The specifics live beside what they govern, and you are expected to read them before you write:

| Before you write in        | Read                                                         |
| -------------------------- | ------------------------------------------------------------ |
| The web application        | [`apps/web/AGENTS.md`](apps/web/AGENTS.md)                   |
| The Android shell          | [`apps/android/AGENTS.md`](apps/android/AGENTS.md)           |
| The Apple shell            | [`apps/apple/AGENTS.md`](apps/apple/AGENTS.md)               |
| A feature module           | [`modules/AGENTS.md`](modules/AGENTS.md)                     |
| A shared library           | [`libraries/AGENTS.md`](libraries/AGENTS.md)                 |
| The mock back-end          | [`tools/mock/AGENTS.md`](tools/mock/AGENTS.md)               |
| A script                   | [`scripts/AGENTS.md`](scripts/AGENTS.md)                     |
| A guidebook page or an ADR | [`docs/AGENTS.md`](docs/AGENTS.md)                           |
| The architecture model     | [`docs/architecture/AGENTS.md`](docs/architecture/AGENTS.md) |

## Project

WSJ27 Campfire is a monorepo for a digital companion for the leaders and the contingent management team of Scouterna's Swedish contingent to the World Scout Jamboree 2027. The front-end lives here: one React web application and the two thin native shells that host it. The back-end services do not – they live in repositories of their own, built and deployed on their own.

The guidebook and the decisions are the source of truth for how the system is put together – [The map](#the-map) says where. Read them rather than inferring, and prefer asking over guessing.

The pnpm layer is the web application, the modules, the libraries, the tools, and the shared checks. The shells build with Gradle and Xcode, which the root scripts drive and pnpm does not manage.

The stack and its tools:

- **Package manager:** pnpm, pinned by `packageManager` in `package.json`
- **Language:** TypeScript, ESM (`"type": "module"`)
- **Runtime:** Node.js LTS, pinned to one version in `.tool-versions`
- **Front-end:** one React web application in `apps/web`, built with Vite and hosted on phones by the native shells in `apps/android` and `apps/apple`
- **Back-end:** Python services in repositories of their own
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

| Question                                | Where it is answered                                                                                                                           |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| What Campfire is and who it is for      | [`README.md`](README.md), then the [guidebook's Introduction](docs/guidebook/index.md)                                                         |
| Who uses it, and what it depends on     | [Context](docs/guidebook/context/index.md)                                                                                                     |
| What it has to do, and hold to          | [Requirements](docs/guidebook/requirements/index.md)                                                                                           |
| How the code is shaped                  | [Architecture](docs/guidebook/architecture/index.md), and [Layers](docs/guidebook/architecture/layers/index.md) for where a piece of code goes |
| How the web and the shells talk         | [The bridge](docs/guidebook/architecture/layers/bridge.md)                                                                                     |
| How it looks and behaves                | [Design](docs/guidebook/design/index.md), and Storybook on port 3002                                                                           |
| How the system is drawn                 | [`docs/architecture/`](docs/architecture/AGENTS.md) – one C4 model, every diagram rendered from it                                             |
| How to set up, run, and check           | [Development](docs/guidebook/development/index.md), and [Working in the repository](#working-in-the-repository) below                          |
| What runs behind the one origin         | [Environments](docs/guidebook/development/environments.md), and [The mock back-end](docs/guidebook/testing/mock.md) for local                  |
| What is tested, and how                 | [Testing](docs/guidebook/testing/index.md)                                                                                                     |
| How it is versioned, released, and run  | [Maintenance](docs/guidebook/maintenance/index.md), and [Versioning](#versioning) below                                                        |
| How work moves from an idea to a commit | [Process](docs/guidebook/process/index.md), and [Agents](#agents) below                                                                        |
| Why something is the way it is          | [The decision log](docs/decisions/index.md)                                                                                                    |
| What a word means                       | [Glossary](docs/guidebook/glossary/index.md)                                                                                                   |

Some guidebook pages describe what is designed but not yet built, without marking which. Where a page and the code disagree, read the code for what exists.

## Working in the repository

`pnpm install` is the only setup step. It installs dependencies and points git at `.githooks`. Every script is in the root `package.json` and explained in [The scripts](docs/guidebook/development/scripts.md).

**Before handing work back, run `pnpm test` and the four checks** – `check:format`, `check:lint`, `check:markdown`, and `check:types` – as separate commands, so one pass reports every failure. Work that touched a shell adds its platform's: `check:android:format`, `check:android:lint`, and `test:android`, or `check:apple:format`, `check:apple:lint`, and `test:apple`. Work that touched a screen adds `pnpm test:web:ui`, scoped to a module with `--project=<module>`. `pnpm format` repairs formatting; lint and Markdown findings are fixed by hand.

The same checks run in GitHub Actions as separate steps ([Continuous integration](docs/guidebook/development/continuous-integration.md)). Locally, `commit-msg` holds the subject to the [commit message rules](#commit-messages), and `pre-push` runs the checks and tests whose toolchains are installed, stopping at the first failure.

Campfire runs in three environments – `pnpm start:local` with the mock, `start:dev` with the real back-end in containers, and `start:prod` with the built image – all on one origin, `http://localhost:8000` ([Environments](docs/guidebook/development/environments.md)). Ports are coordinated by hand, so two servers can run at once: `start:web` is 3000, `start:guidebook` 3001, `start:storybook` 3002, `start:arch` 3003, and `start:mock` 8003. Every `start:` script frees its port first, naming what it stopped, so starting one over a running server replaces it. An agent therefore asks for a running server before starting one, starts its own in the background, waits until it answers, and stops it before handing back.

A Storybook story's title puts it under Introduction, Foundations, Components, or `Modules/<Module>/…`, and a story that needs data stubs it in the story, because nothing in Storybook touches a network. How the catalog is organized is in the guidebook's [Design](docs/guidebook/design/index.md) chapter, and its decorators are in `libraries/AGENTS.md`.

## Repository layout

- `apps/` – the deployable apps: `web` (the React application), `apple`, and `android` (the shells that host it)
- `libraries/` – generic, reusable packages ([`libraries/AGENTS.md`](libraries/AGENTS.md))
- `modules/` – feature modules, each a domain capability ([`modules/AGENTS.md`](modules/AGENTS.md))
- `tools/` – development tooling that ships to nobody: `mock`, the back-end stand-in behind `pnpm start:mock`
- `config/` – shared tooling configuration, one directory per tool, plus `environments/local|dev|prod` for the three ways Campfire runs
- `scripts/` – every script the `pnpm` scripts run ([`scripts/AGENTS.md`](scripts/AGENTS.md))
- `docs/` – the decision log, the software guidebook, and the C4 architecture model
- `.agents/` – the agent definitions, the skills, and the per-branch spec scratch
- `.githooks/` – the git hooks `pnpm install` wires up
- `.github/` – issue templates, the pull request template, and the workflows

Packages are named `@scouterna/wsj27-campfire-<name>`, and `apps/*`, `libraries/*`, `modules/*`, and `tools/*` are the four pnpm workspace roots. Every workspace package exports raw TypeScript source, so nothing under `libraries/` or `modules/` has a build step of its own – Vite compiles them together with the app. `apps/apple` and `apps/android` are native projects with no `package.json`, driven by the root scripts.

## Code organization

- A package's public surface is its `src/index.ts`, and nothing else in it is imported from outside. A module exports its route table and its widget table, and anything else only where the application needs it, with the reason in the index's JSDoc. A library exports what any module may reach for.
- Sort independent declarations alphabetically by identifier – exports in an index, object keys, union members, props.
- Keep declarations together when their relationship decides their order: a component with its props type, a public function with its private helpers, closely coupled state. Comment that order only when it is not self-evident.
- A component is a file named after it, in PascalCase, with its stylesheet and its stories beside it – `Logo.tsx`, `Logo.css`, `Logo.stories.tsx`, in a directory of its own. Everything else is kebab-case; `unicorn/filename-case` allows those two and nothing else.
- A component takes one `props` object typed as a `XxxProps` type declared beside it and exported with it, every field `readonly` and every field documented.

## Comments

- A comment earns its place by saying something the code cannot – why a rule is switched off, why a value is pinned, what breaks without it.
- Every export gets a JSDoc block, and `jsdoc/require-jsdoc` enforces it. One sentence is usually the whole comment, with a description on every `@param` and `@returns`. Each says what the name and the type cannot, never the name restated – `@param at the moment to test against, defaulting to now`, not `@param at the time`. A story is the exception, because its name and its rendered output are its description.
- Where one fact separates the members of a set, put it on the type rather than on each member. Three union members repeating their own names say less than one clause on the union saying what divides them.
- A type comment is a noun phrase saying what a value is, never what the type does or what one of its fields holds. A member comment says what the operation does, returns, or creates. Never one restated as the other – "a stored record with only its version decoded", not "the record version".
- Document a library's public surface as a contract: parameter constraints, return cases that mean different things, errors a caller handles differently, side effects, invariants, lifecycle. Leave out what the names and types already say, `void` returns, and ordinary failures.
- A function that delegates to one the caller cannot see carries that function's contract, because a wrapper is the only documentation its callers will ever read.
- Inside a function, comment only a non-obvious constraint, invariant, decision, or consequence – an architectural boundary, who owns a piece of state, an ordering requirement. Prefer clearer code to a comment narrating it, and put the comment beside what it explains.
- A file in the Android shell and its counterpart in the Apple shell are twins, and twins carry the same comments – the same members documented, in the same words wherever the fact is the same. A difference reads as a claim that the platforms differ, so where they disagree without cause, one of them is wrong.
- Say a thing once. A fact documented where it is implemented is not repeated on every caller that passes through it. A comment that is too long to read is usually two explanations of the same thing rather than one long one.
- Write a comment that survives a rename, a move, or a refactor. State the reason, invariant, or constraint rather than symbol names, counts, or call sequences, and keep the reason itself – "the back-end has no batch endpoint, so these cannot be combined", not "these cannot currently be combined". A comment never counts what the code enumerates – "the unit colors", not "the five unit colors".
- Name a path, an endpoint, or a URL only where nothing nearby does. Beside the code that builds it, the comment is a second copy that drifts out of date; in a library that never sees the back-end, it is the only thing saying where the data comes from.
- Write sentences, not labels and glosses. Where a colon stands in for "because" or "which is", write the word – "an expired session signs out, because stale data is worse than none", not "an expired session signs out: stale data is worse than none".
- Concise means dropping redundancy, not context. Before deleting a comment, ask whether a shorter wording keeps what the code cannot express.
- A comment describes the code as it is now – no deleted code, earlier commits, migrations, a dependency that was removed, an approach that was tried and rejected, or behavior that is planned rather than written. That history goes in the commit message, or in an ADR when the choice was significant. No parked tasks, questions, or unexplained workarounds either; those go in an issue.

Three that earn their place, because each says something the code beside it cannot:

```ts
// The session can end while the read is in flight. Whatever resolves here is written
// into the store the gate just cleared, so a late answer is refused instead.
```

```ts
// Wrapped, so the same function subscribed twice is two subscriptions and each
// unsubscribe removes only its own.
```

```ts
// The timer and a visibility change can both land inside one grace; only the first asks.
```

## Architecture and decisions

Campfire is built on decisions made explicitly and written down, so the reasoning stays understandable over time. Significant decisions are recorded as ADRs under [`docs/decisions/`](docs/decisions/index.md); the system is described in the [guidebook](docs/guidebook/index.md); the C4 model lives in [`docs/architecture/`](docs/architecture/AGENTS.md).

- Read the decisions and the guidebook before a change that touches architecture.
- The code follows a simplified Clean Architecture. A module has up to three layers – domain, data, and presentation – and a dependency only points inward. It leaves out use cases, repositories, and a dependency container: a screen calls a hook, the hook reads a query the data layer builds, and what crosses a module travels through context or registration ([Layers](docs/guidebook/architecture/layers/index.md), [ADR 016](docs/decisions/016-compose-the-web-application-from-feature-modules.md)).
- Record a decision as a new ADR only when it earns one by the test in [`docs/AGENTS.md`](docs/AGENTS.md#the-decisions) – most changes do not – and write it as that file says.
- NEVER change what an accepted ADR decided without a new ADR that supersedes it, and never silently contradict one. Editing a record to make it clearer – its wording, its structure, a list brought up to date – is fine ([ADR 001](docs/decisions/001-record-architecture-decisions.md)).
- The guidebook is the opposite: a living description of the design, rewritten when the design changes. It describes the shape of the system rather than its code, so most changes leave it alone – but a change that makes a page wrong is not done until the page is right again ([`docs/AGENTS.md`](docs/AGENTS.md)).
- The architecture model is edited as DSL and arranged in Structurizr's browser UI. Only the browser writes a layout, so a model change means a `pnpm start:arch` session before `pnpm build:arch`. Read `docs/architecture/AGENTS.md` first.
- **An agent never writes `docs/architecture/workspace.json` directly, under any circumstance** – not by hand, not by scripting a merge of old and freshly exported JSON. It holds the maintainer's manual layout, and any agent-written version destroys that work. After a DSL edit, stop and ask the maintainer to run `pnpm start:arch` and arrange the affected views; do not attempt a workaround that touches the file yourself.

## Where agent material lives

Everything an agent reads lives under `.agents/` – the definitions in `agents/`, the skills in `skills/`, and the per-branch scratch in `specs/`. Each harness finds it through a relative symlink rather than a copy: `.claude/agents` and `.claude/skills` for Claude Code, `.github/agents/<name>.agent.md` for GitHub Copilot, and a `CLAUDE.md` beside every `AGENTS.md`, made with `ln -s AGENTS.md CLAUDE.md`. markdownlint ignores every symlink, so each file is linted once at its real path.

An agent's frontmatter carries `name` and `description` and nothing else, because a key one harness does not know is ignored or fails in it. An agent that needs a skill says so in its prose.

## Agents

Four agents in `.agents/agents/` carry work from a need to reviewed code, with a human gate between each: **`analyst`** (the issue, then requirements, then reconciliation), **`architect`** (design, ADRs, guidebook), **`developer`** (implementation), **`reviewer`** (findings, then a file-by-file walkthrough). Their own definitions hold the detail, and the human drives every step – the agents propose, the human approves.

Six steps, each with one named output, so what "done" means is never in doubt:

| Step      | Agent       | Output                                                                                        |
| --------- | ----------- | --------------------------------------------------------------------------------------------- |
| Capture   | `analyst`   | A GitHub issue – lean, and tracked                                                            |
| Detail    | `analyst`   | `requirements.md` – numbered requirements with testable acceptance criteria                   |
| Design    | `architect` | `design.md`, plus any ADRs and guidebook updates the decisions call for                       |
| Build     | `developer` | The code and its tests, left in the working tree                                              |
| Review    | `reviewer`  | The findings, a file-by-file walkthrough, and the commit message and pull request description |
| Reconcile | `analyst`   | The issue updated to match what was actually built                                            |

- Requirements and design are working scratch in `.agents/specs/<branch>/`, gitignored, where `<branch>` is the branch name with `/` replaced by `-` – `feature/7-status-reporting` becomes `.agents/specs/feature-7-status-reporting/`, the same whether or not you work in a worktree. The durable record is the issue, the ADRs, the guidebook, and the code.
- Requirements are numbered so the design and the code trace back to them – `Requirements: 2.1`.
- Not every issue needs the full flow – a one-line task or a clear bug can go straight to a small change.
- Agents never create branches, never commit, and never change the working context – the tree the work started in is the tree it ends in.
- An agent may fan genuinely independent work out to subagents, under the rules below ([ADR 031](docs/decisions/031-adopt-the-agent-driven-working-process.md)). Each agent's definition says what in its role fans out.

An agent that fans out:

- Spawns only its own type or a subtype of it. An agent that spawns another role is arranging its own approval.
- Inlines everything a subagent needs – the spec folder is gitignored and uncommitted work is not in a fresh checkout, so a subagent pointed at a path finds nothing and guesses.
- Has subagents report back, and writes every file and judges every finding itself.
- Never touches the human's working context – no branch, and no worktree they will see.
- Keeps the human's approval before and after, as always.

## Agent skills

Reusable domain knowledge lives as skills under `.agents/skills/<name>/` – each a `SKILL.md` plus reference files. Load the ones the work touches.

- `knowing-wsj27` captures the WSJ27 domain – the official jamboree and the Swedish contingent – so an agent starts from accurate context instead of guessing.
- `knowing-wsj27-services` covers the back-end services Campfire calls – sign-in, the list of participants, WSJ27 roles and access rules – and the platform, CMS, and Discord beside them.
- `knowing-scoutnet` covers Scoutnet and ScoutID – members, groups, projects, sign-in, and how the WSJ27 registration forms are stored and decoded.
- `writing-markdown` covers the Markdown this repository accepts: the house conventions, the quirks Prettier and markdownlint impose, and the VitePress syntax the guidebook adds on top.
- A skill's frontmatter `name` matches its directory, and its `metadata.version` is a quoted `major.minor` string. **Bumping it is what publishes the skill:** `release_skills.yml` packages it as a GitHub Release tagged `<name>-v<version>`, and an unchanged version is skipped because its tag already exists. A change without a bump would silently never ship, so `check_skills.yml` fails a pull request that edits a skill and leaves its version alone.
- A published skill is used two ways: read directly by agents working in the repository, and uploaded to Claude.ai and the Claude apps (Settings > Features) as an installable Skill for people.

## Language and writing

These rules apply to all text in the repository – documentation, comments, commit messages, issues, and pull requests – and to the message an agent hands back when it finishes.

Everything here is read by someone who has the code open. Write the least that says what the code and the diff cannot. Every sentence kept must tell the reader something they did not already have.

| Text                    | Budget                                                                   |
| ----------------------- | ------------------------------------------------------------------------ |
| Hand-back message       | Three sentences at most: what changed, anything surprising, what is open |
| ADR                     | One screen, about 300 words; each rejected alternative in one line       |
| Guidebook page          | One topic; describe how the system works, not how it came to be          |
| Requirements and design | One line per criterion; a design no longer than the change               |

A budget is a ceiling, not a target. Exceed one only when asked. [Issues](#issues-and-labels), [Commit messages](#commit-messages), and [Pull requests](#pull-requests) have sections of their own, and decision records have [theirs](docs/AGENTS.md#writing-a-decision-record) in `docs/AGENTS.md`. Those sections are the rules for them.

Never write:

- A restatement of the task, the diff, or the files touched
- Summary, Overview, Conclusion, or Next steps sections
- Sentences about the text itself – "This PR…", "This document describes…"
- A testing section saying the checks passed – continuous integration shows that
- Explanations of standard language, platform, or framework concepts
- A contrast or one-line closer that adds weight but no fact – "That is the real win."
- Filler and inflation – "robust", "comprehensive", "seamless", "ensures", "crucial"
- Hedges on facts you checked, and offers of further help

Before handing text back, cut it: delete every sentence that repeats another sentence, the code, or the diff. Then check that nothing only the text could say was lost.

Style:

- American English always – "color", "organize", "behavior".
- Use en-dash (–) only – never em-dash (—), and never a hyphen for breaks or ranges. "2026–2027", "early – on purpose".
- Use the Oxford comma. Write "front-end" and "back-end" hyphenated.
- No corporate language – never "leverage", "synergy", "deliver solutions", or calling people "resources".
- Be direct and concrete. Short sentences beat long ones. Say what something is, not what it "aims to enable".

Markdown follows the `writing-markdown` skill. In short:

- A blank line before every list – after headings, paragraphs, or bold text.
- ATX headings only, one H1 per document, no skipped levels.
- Fenced code blocks only, always with a language identifier.
- Descriptive link text, and alt text on every image.

## Issues and labels

Work is tracked as GitHub issues, created from the templates in `.github/ISSUE_TEMPLATE/`. Blank issues are switched off, so every issue arrives in one of three shapes. The `analyst` agent drafts and creates well-formed issues – see [Agents](#agents) for how they fit the wider workflow.

- **Type** – every issue has a GitHub issue type: **Feature** (a capability to build), **Bug** (something that does not work), or **Task** (a chore that is neither). Each template sets its own, and `gh issue create --type` sets it from the command line. The type is not a label.
- **Audience** – a feature and a bug name who they are for, from the dropdown in `feature.yml` and `bug.yml`. It lists the same people the architecture model draws, in the same words, and is never a label.
- **Component** – a `component:*` label for every area an issue touches – an app, a module, or a cross-cutting area. No template applies one, so they go on by hand or with `--label`.

Work across the WSJ27 repositories is followed on the [WSJ27 project](https://github.com/orgs/Scouterna/projects/8), with a board for Campfire, one for the back-end services, and one for the CMS and Discord, beside a Backlog of everything. A Campfire issue joins it on its own, starts in Todo, and moves to Done when it closes. The board holds what someone is working on now and what comes next, not every idea, and there are no milestones.

Work Campfire needs in a repository it does not own – the auth service, the project API, the CMS – starts as a draft on the project rather than as an issue there. The draft says what is needed and why in a few sentences, and may be in Swedish, since it is read by the people who look after that repository rather than kept in this one. Whoever picks it up turns it into an issue in their repository, and the Campfire issue that waits on it records it as blocked by from then on.

An issue is read long before anyone opens the code, so it says the need and the outcome and leaves the how to the requirements, the design, and the commits:

- **The title** is a plain sentence naming the need, with no type prefix – "Show a leader which of their participants have not paid".
- **Each field** gets the fewest sentences that carry it. The problem in one or two, the proposal in a few, and "done" as a short list of observable outcomes. An optional field with nothing to add is left as `_No response_` rather than filled.
- **No restating** the title in the problem, the problem in the proposal, or the template's own question in the answer.
- **No implementation** – no file paths, component names, or state shapes. Those belong to the design and the code.
- **Reconciling** rewrites the body to say what was built. It never appends a history of what changed.
- A bug is what happened, the steps, and what should have happened. Anything beyond that earns its place only if it helps someone reproduce it.

The label set grows with the project, and `gh issue create` fails on a label that does not exist, so read it live with `gh label list`.

## Git workflow

- NEVER commit unless explicitly asked, and do not offer or suggest it.
- NEVER push – the maintainer handles all pushing.
- NEVER create GitHub issues, pull requests, or comments unless explicitly asked.
- NEVER skip a git hook with `--no-verify`. A failing hook is fixed, not bypassed.
- NEVER add AI attribution – no assistant co-author trailers, no "generated by" footers.
- Every change should be tracked by a GitHub issue. Branches are `<type>/<issue>-<slug>`, for example `feature/12-status-reporting`.
- All changes go through pull requests, merged by rebasing.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/), enforced by the `commit-msg` hook: `<type>: <description>`, optionally a blank line and a body.

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Do not use a scope. `feat(auth): …` is valid Conventional Commits and is rejected here.
- A revert is `revert: …`. Git's own `Revert "…"` subject is rejected here, because the version rule would read it as earning nothing.
- Subject: imperative, lowercase first word, no trailing period. Aim for 50 characters; 72 is the ceiling.
- Body: optional, though most commits have one – a change worth making usually has a reason the diff cannot show. It is not an inventory of the diff: a change earns a bullet only where a reader with the diff open would ask why, and the bullet answers that. One bullet per decision rather than per change, since what follows from a decision belongs in its bullet. Five bullets are right when five decisions were made, and two are too many when they restate the diff.
- Bullet shape: one `-` per point, each a full sentence with a capital first word and a period, wrapped at about 72 characters with continuation lines indented two spaces, and a blank line between bullets. 100 characters is the enforced ceiling on a line.
- Read each bullet back with the diff in front of you. One that states only what changed, with no reason attached, is the diff written out in prose – give it the reason or cut it. Write sentences, not glosses, as in [Comments](#comments).
- A commit names symbols, paths, and counts freely. It describes one moment and never goes stale, so the durability rule under [Comments](#comments) does not apply. Reasoning that has to stay true beside the code goes in a comment instead.
- Breaking change: `!` after the type – `feat!: …`.

```text
feat: add daily unit status report

- Show each unit's last check-in on the home screen, so the contingent
  management team sees every unit at a glance.

- Refetch on focus rather than polling, since the report is read on
  demand and does not need a live subscription.
```

## Pull requests

The title is a sentence with no type prefix – "Show each unit's daily status on the home screen". The issue is linked by a `Closes #<number>` line at the end of the description, which is how GitHub closes it on merge.

The description opens with a sentence or two saying what is true now, and then carries only the parts the change actually has:

```text
Show each unit's daily status on the home screen

The home screen now shows every unit's last check-in, so the contingent management team sees the whole contingent at a glance.

Worth a close read:

- The report refetches on focus rather than polling, since it is read on demand.
- A unit that has never checked in sorts first rather than last.

The mock seeds a check-in for every unit, so the never-checked-in case wants a hand-check against the dev environment.

Closes #40
```

- **Worth a close read** – the decisions and the non-obvious parts, a bullet each, naming the ADR where there is one. Do not count them in the lead-in, or the count is wrong the moment a bullet moves. Leave the whole list out when a reviewer needs no pointing.
- **Where it departs from the issue** – what was built differently from what the issue asked for, a bullet under Worth a close read, since the reviewer reads the pull request against the issue and the analyst reconciles the issue afterward.
- **The closing paragraph** – what could break, and anything the verification took that continuous integration does not run. Leave it out when there is neither.
- **No inventory of any kind** – not the changed files, not the workflows or endpoints added. The description gives the shape of the whole change; the commits give the parts. A dependency added or removed is the exception – it is a decision, so it gets a bullet under Worth a close read.
- **No checklist and no testing section** – continuous integration shows what passed.
- **No line length to hold** – a description is read in a browser rather than a terminal, so write one line per paragraph and let it wrap. Reach for bullets wherever there is more than one of something, since a wall of equal paragraphs is what makes even a short description hard to read.
- A small change is a title, a sentence, and the `Closes` line, and needs nothing else.

The description can be this short only because the commits are not. Every decision's reasoning already sits in the commit that made it, so a reviewer who wants the why for one part reads that commit. This shape depends on the branch following [Commit messages](#commit-messages) – where the commits are thin, fix the commits rather than growing the description.

## Versioning

The web image, the Android shell, and the Apple shell each have their own CalVer version, `YEAR.FEATURE.PATCH`, kept in a git tag rather than the tree ([ADR 034](docs/decisions/034-version-each-artifact-from-its-own-commits.md)). A commit counts toward every artifact whose paths it touches, and its type decides how far:

- **The feature segment** – any `feat`, or any type marked `!`.
- **The patch segment** – otherwise, any `fix` or `revert`.
- **Nothing** – every other type.

`pnpm version:next <android|apple|web>` prints an artifact's next version. [Release](docs/guidebook/maintenance/release.md) has the rest, including how the web reaches dev and prod ([ADR 035](docs/decisions/035-promote-the-web-by-moving-environment-tags.md)).
