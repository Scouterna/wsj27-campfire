# Conventions

The strongest signal for how to write something is how the neighboring code already writes it. Beyond that, the conventions are settled, and most are enforced by a tool rather than by a reviewer. This page gives each rule with its reason; the root [`AGENTS.md`](https://github.com/Scouterna/wsj27-campfire/blob/main/AGENTS.md) holds the full wording, with examples, and governs where the two differ.

## Work and history

- **Every change is tracked by a GitHub issue**, created from one of the templates – feature, bug, or task – and its branch is `<type>/<issue>-<slug>`, such as `feature/12-status-reporting`, so a branch leads back to why it exists.
- **Every change goes through a pull request, merged by rebasing.** The history stays linear, with no merge commits and no squashing, because the release reads each artifact's version from that log ([ADR 034](/decisions/034-version-each-artifact-from-its-own-commits)).
- **Commits are Conventional Commits without a scope**, held by the `commit-msg` hook. `feat(auth): …` is valid Conventional Commits and is rejected here. The subject is imperative and lowercase, aimed at 50 characters with 72 as the ceiling.
- **The commit type moves the version.** The web image and each shell carry their own CalVer version, `YEAR.FEATURE.PATCH`: a `feat` or a `!` moves the feature segment, a `fix` or a `revert` the patch, and the other types nothing. Nobody edits a version by hand ([Release](../maintenance/release)).
- **A commit body gives the reasons, one bullet per decision**, because the diff already shows what changed.
- **No AI attribution** – no assistant co-author trailer and no "generated with" footer. The history says what changed and why, and who typed it is not part of that.

## How the code is organized

These are the rules a reviewer holds a change to, and several are ESLint rules rather than opinions.

- **A package's public surface is its `src/index.ts`**, and nothing else in it is imported from outside, so the rest can change without breaking a caller.
- **Dependencies run one way.** The web application imports modules and libraries, a module imports libraries, and nothing imports an app or another module, so a feature can change without reaching into its neighbors. ESLint refuses a relative path across that line, a package that is not a declared dependency fails the type check, and cycles are banned outright ([Code organization](../architecture/code-organization)).
- **Independent declarations are sorted alphabetically** – exports in an index, object keys, union members, props. The order is arbitrary on purpose: nobody has to decide one, and nobody has to guess where something went. Declarations whose relationship decides their order, such as a component and its props type, stay together instead.
- **A component is a PascalCase file in a directory of its own**, with its stylesheet and its stories beside it – `Logo.tsx`, `Logo.css`, `Logo.stories.tsx`. Everything else is kebab-case, and ESLint allows those two cases and nothing else.
- **A component takes one `props` object**, typed as an `XxxProps` type declared and exported beside it, every field `readonly` and documented, because the props are the component's contract.
- **Size limits are enforced**: 500 lines a file, 100 lines a function, and four levels of nesting. The exceptions are written into `eslint.config.ts` with their reasons – the mock's seed data, which is long because the contingent is, and the tests and walk-throughs, where a long linear script is the right shape.
- **Formatting is the formatter's job.** Run `pnpm format`, or the platform's own formatter for Swift and Kotlin, and never hand-align, so no review spends time on layout.

## What a comment is for

A comment earns its place by saying something the code cannot – why a rule is switched off, why a version is pinned, what breaks without it.

- **Every export has a JSDoc block**, enforced by ESLint. One sentence is usually the whole comment, because it is what a caller reads instead of the implementation.
- **A library's public surface is documented as a contract** – parameter constraints, return cases that mean different things, errors a caller handles differently, side effects, and lifecycle – because a caller cannot read the implementation to find out.
- **Inside a function, a comment covers only what is not obvious** – an architectural boundary, who owns a piece of state, an ordering requirement – and sits beside what it explains.
- **A comment describes the code as it is.** History – deleted code, earlier approaches, migrations – goes in the commit message, or in an ADR when the choice was significant, and open work goes in an issue, where something tracks it.

The repository leans on this. Much of the tooling configuration is more comment than setting, and the [decisions](/decisions/) exist so a comment never has to carry an argument.

## Writing

Everything written here – documentation, comments, commit messages, issues, and pull requests – follows the same rules, because all of it is read by someone with the code open.

- **American English, the en-dash for breaks and ranges, and the Oxford comma**, with "front-end" and "back-end" hyphenated.
- **Write the least that says what the code and the diff cannot.** No restated task, no summary sections, and no filler.
- **Markdown has a blank line before every list, ATX headings, and a language on every code fence**, and markdownlint fails the rest.

## How AI-assisted development fits in

Most of the work between a human decision and reviewed code is done by AI agents – an analyst, an architect, a developer, and a reviewer – with a human deciding at every handoff ([ADR 031](/decisions/031-adopt-the-agent-driven-working-process)). [Process](../process/) describes the shape of that, and `AGENTS.md` and the agent definitions under `.agents/agents/` hold the operational detail.

Two rules matter most here. The agents never create branches and never commit, so the git history and the working tree stay the human's. And an agent reads `AGENTS.md`, this guidebook, and the decisions before it writes anything, which is why those three are kept true rather than merely written.
