# 008. Check commits with git hooks

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

[ADR 006](006-lint-and-format-with-a-shared-strict-toolchain.md) settles what the code conforms to, and [ADR 007](007-version-with-calver-on-a-rebased-history.md) what a commit subject looks like. Because the commit type moves the version, a malformed subject is a broken input to the release. Continuous integration checks both, but a failed check costs a push, a wait, and a context switch, and a malformed subject is already history once the branch is pushed. Git offers a hook at both moments that matter – before a commit is written, and before a push leaves the machine.

## Decision

We check commits locally with two git hooks, committed in `.githooks/` and wired up by `prepare` in `package.json`, which points `core.hooksPath` at the directory so `pnpm install` is the only setup step.

- **`pre-push` runs what continuous integration runs** – the four checks and `pnpm test`, then the Kotlin and Swift checks and tests where their toolchains are installed, saying so out loud when one is missing. It checks the whole tree, so it asks the question a pull request will ask, and it stops at the first failure.
- **`commit-msg` validates the subject with [commitlint](https://commitlint.js.org)**, configured in `config/commitlint/` from Conventional Commits' preset, narrowed to the repository's types and the no-scope rule.
- **Hooks are never skipped.** A failing hook is fixed, never bypassed with `--no-verify`. Continuous integration checks the same things as the backstop.

## Consequences

- Each kind of mistake is caught where it is cheapest to fix, and a malformed subject cannot land by accident.
- Committing stays free, and the suite runs only when work is about to leave the machine.
- The tree is judged, not the commits being pushed, so unrelated work in progress can block a push until it is finished or set aside.
- For Swift the hook is the whole gate, because no macOS runner is spent on it. Swift pushed from a machine without Xcode has been checked by nothing.
- commitlint brings a sizable dependency tree, all under [ADR 005](005-pin-every-dependency-and-let-new-releases-age.md)'s rules, for a check that runs on every commit.

## Alternatives considered

- Continuous integration alone – nothing to set up, but every mistake costs a round trip, and a bad subject is found once it is history.
- A regular expression instead of commitlint – no dependencies, but it would have to handle git's comment block, fixup and squash subjects, and each rule's message, which commitlint already gets right.
- Husky – a dependency whose purpose is the one `git config` line `prepare` already runs.
- `lint-staged` on staged files only – faster on a large tree, but a different question from the one continuous integration asks.
- A `pre-commit` hook – the earliest moment, but it charges the whole suite to every unfinished commit, and a hook that taxes the most frequent action gets bypassed.
