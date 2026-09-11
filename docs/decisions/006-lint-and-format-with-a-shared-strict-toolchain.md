# 006. Lint and format with a shared, strict toolchain

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Most of Campfire's code is written by agents, quickly and in volume, and read by a human whose attention is the scarce resource. That inverts the usual economics of code style: writing to a standard costs nothing, and every minute of review spent on formatting, import order, or a missing return type is a minute not spent on whether the code is right.

The repository holds TypeScript, Kotlin, Swift, a large amount of Markdown, and configuration, and the tools that are good at each overlap enough that without a stated division they report the same finding twice or leave a gap between them. There is also a question of how strict to be: a recommended preset catches obvious mistakes, and a strict, type-aware configuration catches a class of bug that otherwise reaches production, at the cost of sometimes refusing code that is fine.

## Decision

We enforce style and quality with one tool per domain, strict, configured once and shared by every package:

- **Prettier owns formatting**, for every file type it understands. ESLint carries no stylistic rule – `eslint-config-prettier` is loaded last and switches off anything that would conflict – so formatting is never a review comment.
- **ESLint owns TypeScript correctness**, with strict type-aware rules, plus security, import hygiene, promise handling, regular-expression safety, complexity limits, and JSDoc on the public API.
- **markdownlint owns Markdown**, and is the only tool that lints it.
- **Kotlin and Swift join on the same terms.** ktlint formats Kotlin from the root `.editorconfig` and Detekt judges it; SwiftFormat and SwiftLint do the same for Swift.
- **Warnings are failures.** ESLint runs with `--max-warnings 0` and SwiftLint with `--strict`, so no severity level accumulates unread.
- **Configuration lives under `config/`, one directory per tool, and is linted like any other code.** ESLint's flat config is the root `eslint.config.ts`, because a flat config expresses its per-path rules directly and leaves nothing to put in a directory. Where a rule is switched off, the reason is written beside it.

## Consequences

- Every file conforms without anyone deciding, so review attention goes to whether the code is correct.
- Type-aware linting needs a full TypeScript program, so it is the slowest check by an order of magnitude – and the only one that sees unsafe `any` propagation and floating promises.
- A plugin update that adds a rule can fail the build on code that has not changed, so a dependency update is something to run the checks against.
- Complexity limits and required JSDoc will sometimes refuse a design that is fine. The escape is a documented exception, never a loosened baseline.
- A change to the lint rules is checked by the rules it changes, which occasionally needs an exception scoped to `config/` alone.

## Alternatives considered

- **A single fast tool, such as Biome.** One binary, no plugin graph, dramatically faster. It has no type-aware rules, and those are the checks that catch the bugs worth catching here.
- **ESLint alone, including for Markdown.** Fewer tools. Tried and removed: its Markdown rules duplicated markdownlint's, so every finding was reported twice.
- **Prettier alone.** Formatting is most of the visible consistency, and it checks nothing about correctness, which is the half that matters when code is written fast and read once.
- **The recommended presets, unmodified.** Less configuration to own. They miss unchecked index access, unsafe `any`, and missing return types – exactly the failures that survive a quick read.
- **Per-package configuration.** More local control, at the cost of drift between packages and the same rules restated in several places.
