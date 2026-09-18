# Conventions

The strongest signal for how to write something is how the neighboring code already writes it. Beyond that, the conventions are settled, and most of them are enforced by a tool rather than by a reviewer:

- **Formatting is the formatter's job.** Never hand-align; run `pnpm format`. Where Prettier has no parser – Swift, Kotlin, shell – the platform's own formatter owns the file, or review does.
- **Commits are Conventional Commits on a rebased, linear history, with no scope.** `feat(auth): …` is valid Conventional Commits and is rejected here. The subject is imperative and lowercase, aimed at 50 characters with 72 as the ceiling; the body is at most three bullets saying why rather than how. The `commit-msg` hook holds the line ([ADR 007](/decisions/007-version-with-calver-on-a-rebased-history)).
- **No AI attribution, ever.** No assistant co-author trailer, no "generated with" footer. The history says what changed and why; who typed it is not part of that.
- **Every change is tracked by a GitHub issue,** created from one of the three templates in `.github/ISSUE_TEMPLATE/` – feature, bug, or task – and branches are named `<type>/<issue>-<slug>`, for example `feature/12-status-reporting`. All changes go through pull requests, merged by rebasing.
- **The commit type moves the version.** Campfire is on CalVer, `YEAR.FEATURE.PATCH`, at `2026.3.0`: a `feat` bumps the feature segment, a `fix` the patch segment, and the other types move nothing. The scheme and what to do with it are in [Maintenance](../maintenance/).
- **Language and Markdown follow the house rules** – American English, the en-dash for breaks and ranges, the Oxford comma, "front-end" and "back-end" hyphenated, a blank line before every list, ATX headings, and fenced code blocks with a language identifier. The full rules are in `AGENTS.md`, and they cover everything written here: documentation, comments, commit messages, issues, and pull requests.

## How the code is organized

These are the rules a reviewer will hold a change to, and several of them are ESLint rules rather than opinions.

- **A package's public surface is its `src/index.ts`,** and nothing else in it is imported from outside. A module exports the screens and widgets the application mounts; a library exports what any module may reach for.
- **Dependencies run one way.** An app may import a library or a module, a module may import a library, and nothing may import an app or another module. A relative path is the form that would otherwise resolve and work, so ESLint refuses it: `no-restricted-imports` rejects any path into `apps/` or `modules/`, and `import-x/no-relative-packages` any path into another package. A package name that is not a declared dependency cannot resolve at all, so `pnpm check:types` fails on it. Cycles are banned outright.
- **Sort independent declarations alphabetically by identifier** – exports in an index, object keys, union members, props. It is an arbitrary order, and that is the point: nobody has to decide one, and nobody has to guess where something was put.
- **Keep declarations together when their relationship decides their order** – a component with its props type, a public function with its private helpers, closely coupled state. Comment that order only when it is not self-evident.
- **A component is a file named after it, in PascalCase, in a directory of its own,** with its stylesheet and its stories beside it: `Logo.tsx`, `Logo.css`, `Logo.stories.tsx`. Everything else is kebab-case, and `unicorn/filename-case` allows those two cases and nothing else.
- **A component takes one `props` object** typed as an `XxxProps` type declared beside it and exported with it, every field `readonly` and every field documented.

Size limits are enforced rather than suggested: 400 lines a file, 100 lines a function, four levels of nesting. The exceptions are written into `eslint.config.ts` with their reasons – the mock's seed data, which is long because the contingent is, and the test and walk-through files, where a long linear script is the right shape.

## What a comment is for

A comment earns its place by saying something the code cannot – why a rule is switched off, why a version is pinned, what breaks without it.

- **Every export gets a JSDoc block,** and `jsdoc/require-jsdoc` enforces it. One sentence saying what the declaration is, does, returns, or creates is usually the whole comment, with a description on every `@param` and `@returns`. A story is the exception: its name and its rendered output are its description.
- **A type comment says what the abstraction represents; a member comment says what that operation does** – never one restated as the other. Leave out what the names and types already say.
- **Document a library's public surface as a contract,** because a caller cannot read the implementation to find out: parameter constraints, return cases that mean different things, errors a caller handles differently, side effects, invariants, and lifecycle. Leave out ordinary failures.
- **Inside a function, comment only a non-obvious constraint, invariant, decision, or consequence** – an architectural boundary, who owns a piece of state, an ordering requirement. Prefer clearer code to a comment narrating unclear code, and put the comment beside what it explains.
- **Concise means dropping redundancy, not context.** Before deleting a comment, ask whether a shorter wording keeps what the code cannot express.

Two things never belong in one. A comment describes the code as it is now, so there are no references to deleted code, earlier commits, migrations, a dependency that was removed, or an approach that was tried and rejected – a reader cannot act on any of it, and it outlives the memory of why it was written. That history goes in the commit message, or in an ADR when the choice was significant. And no task, open question, or unexplained workaround is parked in a comment, because nothing tracks it there; it goes in an issue.

The repository leans on this heavily. Most of the tooling configuration is more comment than setting, and the [decisions](/decisions/) exist so a comment never has to carry an argument.

## How AI-assisted development fits in

Most of the work between a human decision and reviewed code is done by AI agents – an analyst, an architect, a developer, and a reviewer – with a human deciding at every handoff ([ADR 031](/decisions/031-adopt-the-agent-driven-working-process)). The [Process](../process/) chapter is the shape of that; `AGENTS.md` and the agent definitions under `.agents/agents/` are the operational detail, and where they disagree with this page, they govern.

Two rules matter here more than anywhere else. The agents never create branches and never commit – the git history and the working context stay the human's. And an agent reads `AGENTS.md`, this guidebook, and the decisions before it writes anything, which is the reason those three are kept true rather than merely written.
