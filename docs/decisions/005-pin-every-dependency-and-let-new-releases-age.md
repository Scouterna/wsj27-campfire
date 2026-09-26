# 005. Pin every dependency and let new releases age

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

The npm ecosystem's characteristic attack is a compromised maintainer account publishing a malicious version of a trusted package. It behaves normally, runs its payload during installation, and is pulled within hours to a few days – so the projects harmed are the ones that installed during that window. Campfire is more exposed than its size suggests, because a monorepo installs hundreds of transitive packages it never chose, and agents add packages without any instinct for whether a version looks new.

## Decision

We hold every install to a policy declared in `pnpm-workspace.yaml`:

- **A version published less than three days ago is refused**, and so is one with no publish timestamp, so a compromised release has that long to be pulled before it can reach us.
- **Versions are pinned exactly**, never as a `^` or `~` range, so an install never resolves to something the lockfile did not describe.
- **Install scripts are opt-in.** A package runs a build script only when it is listed, and an explicit `false` records a deliberate skip.
- **An unmet peer dependency fails the install**, so a version mismatch is caught there rather than as behavior nobody can explain.
- **Continuous integration installs from the lockfile only**, so a manifest edited without regenerating it fails the build.

## Consequences

- A package published this week may not install. When a needed fix has just shipped, the choice is to wait or to lower the policy deliberately.
- Every update is a deliberate act with a diff, rather than something that happens on one machine and not another.
- A dependency that needs an install script is added by someone who has read the script.
- A peer range that has not caught up with a major version keeps that version unavailable until it does.
- The policy narrows the most common window. It does not stop a package that stays malicious longer, or replace judgment about what to depend on.

## Alternatives considered

- A longer window, of a week or two – past a few days the protection barely grows while the friction does, with a needed fix out of reach for a fortnight.
- Version ranges with a lockfile – the lockfile protects continuous integration, but a fresh resolve pulls in anything the range allows.
- Audit tooling alone – an advisory exists only once a compromise is public, which is after the window this policy closes.
