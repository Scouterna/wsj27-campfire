# 007. Version with CalVer on a rebased history

::: info Status
<p><Badge type="warning" text="Superseded by ADR 034" /> <Badge type="info" text="2026-09-15" /></p>
:::

::: warning A later record replaced part of this
[ADR 034](034-version-each-artifact-from-its-own-commits.md) replaces the one version moved by hand with a version per artifact, worked out from the commits that touch it. The commit convention and the rebased history stand, and ADR 034 restates them.
:::

## Context

How commit messages are written, how the version moves, and how branches land on the main line are one system. Left apart they drift – inconsistent subjects, a version bumped by hand and forgotten, a tangled history. Tied together, the commit message says how the version moves, and the merge strategy keeps that log readable for whoever takes the project over.

## Decision

We tie three conventions into one:

- **Conventional Commits.** Every subject is `<type>: <description>` – imperative, lowercase, no scope – with an optional body saying why. The types are `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, and `revert`, and `!` marks a breaking change.
- **Calendar Versioning**, shaped `YEAR.FEATURE.PATCH`. A `feat` moves the feature segment, a `fix` the patch segment, and the other types nothing. The first feature release of a new year adopts that year; a patch stays on the year of the feature it patches.
- **A rebased, linear history.** Every change is a pull request merged by rebasing – no merge commits and no squashing – so the log is the sequence of commits the version is read from.

## Consequences

- The commit type says which segment moves, and the edit to `package.json` is made by hand, so a forgotten bump is a real failure mode.
- The year makes the cadence legible, and the version promises no API compatibility it does not have.
- A linear history is easy to read and bisect, at the cost of discipline on every commit.
- Rebasing rewrites hashes as a branch lands, so contributors work on their own branches and the maintainer merges.

## Alternatives considered

- Semantic Versioning – it communicates API compatibility, which an app with no public API does not have.
- Merge commits, or squash-merge – merge commits tangle the log, and squashing discards the individual commits the version is read from.
