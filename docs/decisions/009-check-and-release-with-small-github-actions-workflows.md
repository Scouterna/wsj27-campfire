# 009. Check and release with small GitHub Actions workflows

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Campfire's outputs have almost nothing in common at build time – the agent skills as releases, the guidebook as a static site, and the web, Android, and iOS apps, with their own toolchains, credentials, and, for iOS, a runner that bills far above the rest. What they share is the repository-wide check. Gating a pull request and shipping what lands want different triggers, permissions, and failure behavior: a failed check blocks a merge, while a failed release must not leave a half-published artifact. And a workflow skipped by an `on: paths:` filter reports no status at all, so a required check behind one can block a merge forever.

## Decision

We automate checks and releases with GitHub Actions, where the code, the issues, and the releases already are, in small single-purpose workflows:

- **Workflows are named for what they do.** `check_*` validates without building, `test_*` drives an output, `build_*` compiles one output, `release_*` ships one, and `promote_*` moves a pointer to something already released. Only the last two write anywhere. Releases run on a push to `main` and can be retried by hand; a promotion runs only by hand.
- **A check filters inside the job, never with `on: paths:`**, because a job skipped by an `if:` still reports as passing. A release, which nothing waits on, filters at the trigger.
- **Every check reports separately.** `check.yml` runs one step per check script, each running after a sibling failed.
- **Least privilege, declared.** Read-only workflows say so, and a release scopes its write permission to the job that needs it.
- **Pull request runs cancel when superseded; releases and promotions queue and never cancel**, because a canceled one can leave a tag without its release or a site half-deployed.
- **Releases trust the pull request gate** rather than checking again on `main`.

## Consequences

- Any check can be required, because every one reports on every pull request.
- A pull request that touches one output does no work for the others, so cost follows the change.
- A new `check:*` script needs its own step in `check.yml`.
- Trusting the gate holds while one person merges one change at a time. Two concurrent merges can pass alone and break together.
- No workflow checks Swift, so the pre-push hook is its whole gate ([ADR 008](008-check-commits-with-git-hooks.md)).

## Alternatives considered

- Another continuous integration service – some are faster or cheaper, but each is a second account, credentials into this repository, and an integration to keep working.
- One workflow with a job per output – fewer files, but read-only work sits beside the jobs that hold publishing credentials.
- Path filters at the workflow level – the obvious way to skip work, and the reason required checks stop being satisfiable.
- Checks on `main` as well – a second full run on every merge, for a break it could only report after the fact.
