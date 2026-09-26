# 006. Lint and format with a shared, strict toolchain

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Most of Campfire's code is written by agents, quickly and in volume, and read by a human whose attention is the scarce resource. Writing to a standard costs an agent nothing, and every minute of review spent on formatting or import order is a minute not spent on whether the code is right. The repository holds TypeScript, Kotlin, Swift, Markdown, and configuration, and the tools for each overlap enough that, without a stated division, they report the same finding twice or leave a gap between them.

## Decision

We enforce style and quality with one strict tool per domain, configured once and shared by every package:

- **Prettier owns formatting** for every file type it understands. ESLint carries no stylistic rule – `eslint-config-prettier` loads last and switches off anything that would conflict.
- **ESLint owns TypeScript correctness**, with strict type-aware rules, plus security, import hygiene, promise handling, regular-expression safety, complexity limits, and JSDoc on the public API.
- **markdownlint owns Markdown**, and is the only tool that lints it.
- **Kotlin and Swift join on the same terms** – ktlint formats Kotlin and Detekt judges it; SwiftFormat and SwiftLint do the same for Swift.
- **Warnings are failures.** ESLint runs with `--max-warnings 0` and SwiftLint with `--strict`.
- **Configuration lives under `config/`, one directory per tool, and is linted like any other code.** ESLint's flat config is the root `eslint.config.ts`. A rule switched off carries its reason beside it.

## Consequences

- Every file conforms without anyone deciding, so review goes to whether the code is correct.
- Type-aware linting needs a full TypeScript program, so it is the slowest check – and the only one that sees unsafe `any` and floating promises.
- A plugin update can add a rule that fails unchanged code, so a dependency update is run against the checks.
- Complexity limits and required JSDoc will sometimes refuse a design that is fine. The escape is a documented exception, never a looser baseline.

## Alternatives considered

- A single fast tool, such as Biome – one binary and much faster, but with no type-aware rules, which are the checks that catch the bugs worth catching here.
- ESLint for Markdown too – its Markdown rules duplicate markdownlint's, so every finding is reported twice.
- The recommended presets, unmodified – less to own, but they miss unchecked index access, unsafe `any`, and missing return types, the failures that survive a quick read.
