# 007. Version with CalVer on a rebased history

::: info Status
<p><Badge type="warning" text="Superseded by ADR 034" /> <Badge type="info" text="2026-09-15" /></p>
:::

::: warning A later record replaced part of this
[ADR 034](034-version-each-artifact-from-its-own-commits.md) supersedes the one version moved by hand: each artifact now has a version of its own, worked out from the commits that touch it, and the tree holds a placeholder. The commit convention and the rebased history stand and are restated there.
:::

## Context

How commit messages are written, how the version number moves, and how branches land on the main line are three conventions that are really one system. Left to drift apart they fragment – inconsistent subjects, a version bumped by hand and forgotten, a tangled merge history. Tied together, the commit message says how the version moves, and the merge strategy keeps the log that says so readable, for a project meant to be handed over and reused across future events.

## Decision

We couple three conventions into one:

- **Conventional Commits.** Every subject is `<type>: <description>` – imperative, lowercase, no scope – with an optional body saying why. The types are `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, and `revert`, and `!` marks a breaking change.
- **Calendar Versioning**, shaped `YEAR.FEATURE.PATCH` – `2026.1.0`. A `feat` moves the feature segment, a `fix` moves the patch segment, and the other types leave the version alone. The first feature release of a new year adopts that year; a patch stays on the year of the feature it patches.
- **A rebased, linear history.** Every change goes through a pull request, and a pull request is merged by rebasing – no merge commits and no squashing – so the log is a straight sequence of the commits that drive the version.

## Consequences

- The commit type says which segment moves, and the edit to `package.json` is made by hand. A release is a deliberate act, and a forgotten bump is a real failure mode.
- The year segment makes the project's cadence legible at a glance, and the version promises no API compatibility it does not have.
- A linear history is easy to read and bisect, at the cost of discipline on every commit and every merge.
- Rebasing rewrites commit hashes as a branch lands, so contributors work on their own branches and the maintainer merges.

## Alternatives considered

- **Semantic Versioning.** The common default. It communicates API compatibility that an app with no public API contract does not have; the day a package publishes a stable API is the day to revisit.
- **Free-form commit messages.** Less friction per commit, and nothing can then read the version's movement from them.
- **Merge commits, or squash-merge.** Merge commits preserve branch topology in a tangled log; squashing discards the individual commits the version is read from.
