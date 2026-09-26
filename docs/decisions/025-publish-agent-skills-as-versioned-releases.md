# 025. Publish agent skills as versioned releases

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

The agents need domain knowledge that is not in the code – what the jamboree is, how the contingent is organized, the services and systems it depends on. It is captured as agent skills, a `SKILL.md` and its reference files, which an agent in the repository reads from disk. A person in the Claude apps wants the same knowledge, and those apps have no filesystem, so a skill reaches them only as an uploaded archive. The material changes as its sources are refreshed, so a reader needs to know which version they have, and the maintainer whether a change reached anyone.

## Decision

We keep skills in the repository as the single source, and publish each one as a versioned release for everyone who cannot read it from there.

- **Skills live in `.agents/skills/<name>/`, committed**, with no install step.
- **Each skill carries a `metadata.version`**, a quoted `major.minor` string.
- **The version is the release trigger.** When it changes, a workflow packages the skill as its own GitHub Release, tagged `<name>-v<version>`. An unchanged version is skipped, because its tag exists.
- **Releases are per skill**, so one skill's refresh does not version another.
- **A change without a bump fails the pull request**, because the version is what ships the change.

## Consequences

- Agents read the files and people install the archive, from one source with no copy to drift.
- The bump is easy to forget, which is why it is checked rather than trusted.
- Getting a skill into the Claude apps is a manual upload.
- Publishing a skill publishes its contents, so what goes in a skill is a distribution decision, not only a context one.
- Dated facts go stale between refreshes, so each skill carries its own last-checked dates.

## Alternatives considered

- The repository only – nothing for the Claude apps.
- A package registry – an account and credentials for prose nothing installs as a dependency.
- One release for the whole repository – refreshing one skill versions every other.
