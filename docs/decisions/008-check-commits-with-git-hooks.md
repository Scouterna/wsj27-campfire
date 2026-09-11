# 008. Check commits with git hooks

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Two conventions are only as good as their enforcement. [ADR 006](006-lint-and-format-with-a-shared-strict-toolchain.md) settles what the code has to conform to, and [ADR 007](007-version-with-calver-on-a-rebased-history.md) what a commit subject has to look like – and because the commit type is what moves the version, a malformed subject is a broken input to the release, not a tidiness problem.

Continuous integration checks both, eventually. A failed check on a pull request costs a push, a wait, and a context switch for something the machine could have said before the push, and a malformed subject is worse, because once a branch is pushed that history is what lands and rewriting it is more disruptive than any subject is worth. Git offers a hook at both points that matter – before a commit is written, and before a push leaves the machine.

## Decision

We check commits locally with two git hooks, committed in `.githooks/` and wired up by `prepare` in `package.json`, which points `core.hooksPath` at the directory so `pnpm install` is the only setup step.

- **`pre-push` runs what continuous integration runs** – the four checks and `pnpm test`, then the Kotlin and Swift checks and tests where their toolchains are installed. A missing toolchain is skipped out loud rather than in silence. It checks the whole tree rather than the staged files, so it asks exactly the question a pull request will ask, and it stops at the first failure, because the work is not leaving the machine either way.
- **`commit-msg` validates the subject with [commitlint](https://commitlint.js.org)**, configured in `config/commitlint/` from Conventional Commits' own preset, narrowed to the eleven types and the no-scope rule. The hook does nothing but call it, so the rules live in one place.
- **Hooks are a convenience, not a gate.** `--no-verify` skips them, and continuous integration checks the same things regardless.

## Consequences

- Both classes of mistake are caught where each is cheapest to fix, and a malformed subject cannot land by accident.
- Committing stays free; the suite runs on push, where the work is about to leave the machine. That holds while the suite is fast enough to wait for, and the day people reach for `--no-verify` out of habit is the day to check only what changed.
- The tree is judged, not the commits being pushed. Unrelated work in progress can block a push, and `--no-verify` is the escape when it does.
- For Swift the hook is the whole gate. Checking Swift needs macOS with Xcode and no runner is spent on it, so Swift pushed from a machine without the toolchain has been checked by nothing.
- commitlint brings around fifty packages, all under [ADR 005](005-pin-every-dependency-and-let-new-releases-age.md)'s rules – the largest single addition to the toolchain, for a check that runs on every commit.

## Alternatives considered

- **Continuous integration alone.** No local setup and nothing to bypass. Every mistake costs a round trip, and a malformed subject is discovered once it is already history.
- **A regular expression instead of commitlint.** Zero dependencies for a grammar this small. It would need its own handling of git's comment block, the `--fixup` and `--squash` subjects, and each rule's message – all of which commitlint already has right, and a hand-written version got wrong within an hour.
- **Husky.** Four kilobytes that set `core.hooksPath` and run a directory of scripts – a dependency whose whole purpose is one line of `git config` the `prepare` script runs itself.
- **`lint-staged`, on staged files only.** Faster on a large tree, and a different question from the one continuous integration asks. The one to revisit if the suite grows slow.
- **`pre-commit` instead of `pre-push`.** The earliest possible moment, and it charges the whole suite to every commit, including the unfinished ones a branch is full of. A hook that taxes the cheapest, most frequent action is the one that gets bypassed until it may as well not exist.
