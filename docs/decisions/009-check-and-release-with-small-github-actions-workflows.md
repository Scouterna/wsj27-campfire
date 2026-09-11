# 009. Check and release with small GitHub Actions workflows

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Campfire produces five things with almost nothing in common at build time: the agent skills, packaged as releases; the guidebook, a static site; and the web, Android, and iOS apps – three toolchains, three sets of credentials, and, for iOS, a runner that bills at ten times the rate of the others. What they share is the repository-wide check, which runs across everything because its rules cross package boundaries.

So continuous integration answers two questions separately – what gates a pull request, and what happens when one lands – and they want different triggers, permissions, and failure behavior: a failed check blocks a merge, while a failed release must not leave a half-published artifact behind. There is also a trap in required status checks. A workflow skipped by an `on: paths:` filter reports no status at all, and a required check that never reports blocks the merge forever.

## Decision

We automate checks and releases with GitHub Actions – where the code, the issues, the pull requests, the releases, and the guidebook already are – and keep each workflow small and single-purpose:

- **Workflows are named for what they do.** `check_*` validates without building, `test_*` drives an output, `build_*` compiles one output to prove it compiles, and `release_*` ships one output and is the only kind that writes anywhere. Checks, tests, and builds trigger on pull requests; releases trigger on a push to `main` and carry a manual trigger so a failed one can be retried without an empty commit.
- **A check filters inside the job, never with `on: paths:`.** A job skipped by an `if:` reports as passing, so a check stays eligible to be required while doing no work when it is irrelevant. A release, which nothing waits on, filters at the trigger.
- **Every check reports separately.** `check.yml` runs one step per check script, each executing after a sibling failed, so one run reports every problem rather than the first.
- **Least privilege, declared explicitly.** Read-only workflows say so, and a release scopes its write permission to the job that needs it.
- **Pull request runs cancel on supersede; releases queue and never cancel.** A canceled check wastes nothing. A canceled release can leave a tag without its release, or a site half-deployed.
- **Releases trust the pull request gate** rather than re-validating on `main`.

## Consequences

- Any check can be a required status check, because every one reports on every pull request whether or not it had work to do.
- A pull request that touches one output does no work for the other four, so cost tracks the change rather than the repository.
- `check.yml` enumerates its scripts, so a new `check:*` script means a new step. One step running them all would stop at the first failure and hide every other one behind a round trip.
- Trusting the gate holds while one person merges one change at a time onto an up-to-date branch. With concurrent merges, two changes can pass alone and break together, and only a run on `main` would catch it.
- iOS has no workflow at all. Checking Swift needs macOS with Xcode, and no runner is spent on it, so the pre-push hook is the whole gate for Swift.

## Alternatives considered

- **Another continuous integration service** – CircleCI, Buildkite, or similar. Some are faster or cheaper at scale, and all of them mean a second account, credentials granting access to this repository, and an integration to keep working.
- **One workflow with a job per output.** Fewer files, and `needs:` between jobs. It mixes read-only work with the jobs that hold publishing credentials, and loses the property that every `release_*` file is one that can write somewhere.
- **Path filters at the workflow level.** The obvious way to skip irrelevant work, and the reason required checks silently stop being satisfiable.
- **Checks on `main` as well as on pull requests.** Catches the concurrent-merge case, redundant while one person merges at a time, and easy to add the day that stops being true.
