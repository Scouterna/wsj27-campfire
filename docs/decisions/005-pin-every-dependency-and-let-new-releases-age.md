# 005. Pin every dependency and let new releases age

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

The npm ecosystem's characteristic attack is a compromised maintainer account publishing a malicious version of a package thousands of projects already trust. The version behaves normally, runs its payload during installation, and is discovered and unpublished within hours to a few days. The projects harmed are the ones that installed during that window.

Campfire is exposed to this more than its size suggests. A monorepo installs hundreds of transitive packages it never chose, and much of its dependency handling is done by agents, which add a package when a task calls for one and have no instinct for whether a version looks new. Every defense costs immediacy: some ability to use the newest thing, traded for protection against the newest thing being hostile.

## Decision

We hold every install to a policy declared in `pnpm-workspace.yaml`:

- **A version published less than three days ago is refused**, and so is a package carrying no publish timestamp. A compromised release has that long to be noticed and pulled before it can reach this repository.
- **Versions are pinned exactly**, never as a `^` or `~` range, so an install never resolves to something the lockfile did not describe.
- **Install scripts are opt-in.** A package runs no build script unless it is listed, and an explicit `false` records a deliberate skip. A malicious `postinstall` in a transitive dependency has nothing to run in.
- **An unmet peer dependency fails the install** rather than warning, so a version mismatch is caught at install time instead of surfacing later as behavior nobody can explain.
- **Continuous integration installs from the lockfile only**, so a manifest edited without regenerating the lockfile fails the build.

## Consequences

- A package published this week may not install. When a needed fix has just shipped, the options are to wait or to lower the policy deliberately.
- Every update is a deliberate act with a diff, rather than something that happens on one machine and not another.
- A dependency that needs an install script is added by someone who has read what the script does.
- Strict peer dependencies close doors: a peer range that has not caught up with a major version makes that version unavailable until it does.
- The policy narrows the most common window. It does not defend against a package that stayed malicious longer than three days, or one whose payload is in its published code, and it does not replace judgment about what to depend on.

## Alternatives considered

- **No delay on new versions.** The default. A compromised release installs in the hours before anyone notices, which is exactly when the harm is done.
- **A longer window, of a week or two.** Past a few days the returns fall off while the friction keeps growing – a needed fix unavailable for a fortnight.
- **Version ranges with a lockfile.** The lockfile protects continuous integration, and a fresh resolve – a package added, a lockfile regenerated – pulls in anything the range allows.
- **Audit tooling alone.** Reactive by nature: an advisory exists only after the compromise is public, which is after the window this policy closes.
- **Vendoring dependencies.** Complete control and full reviewability, at a cost in repository size and update effort beyond what this project can carry.
