# 025. Publish agent skills as versioned releases

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Campfire's agents need domain knowledge that is not in the code – what the jamboree is, how the contingent is structured, what the fees and deadlines say. It is captured as agent skills, a `SKILL.md` and its reference files, and an agent working in the repository reads them from disk. The same knowledge is useful outside it: a person answering a question in the Claude apps wants it too, and those have no filesystem to read from, so a skill reaches them only as an uploaded archive.

One body of knowledge, two consumers with different delivery needs – and it changes over time, as the reference material is refreshed with each Bulletin. A consumer needs to know which version they have, and the maintainer needs to know whether a change reached anyone.

## Decision

We keep skills in the repository as the single source, and publish each one as a versioned release for everyone who cannot read it from there.

- **Skills live in `.agents/skills/<name>/`, committed**, so anyone cloning the repository has them with no install step.
- **Each skill carries a `metadata.version`** in its frontmatter, a quoted `major.minor` string.
- **The version is the release trigger.** When it changes, a workflow packages that skill and publishes it as its own GitHub Release, tagged `<name>-v<version>` with the archive attached. An unchanged version is skipped, because its tag already exists.
- **Releases are per skill**, so one skill's refresh does not version another.
- **A change without a bump fails the pull request.** Because the version is what ships a change, a check compares each skill against its released tag and fails when the content moved and the version did not.

## Consequences

- One source serves both consumers – agents read the files, people install the archive – and neither is a copy that can drift.
- The version is the mechanism, not decoration, which makes the bump easy to forget and is why it is checked rather than trusted.
- Getting a skill into the Claude apps is still a manual upload. The release produces the artifact; a person installs it.
- Publishing a skill publishes its contents. The reference material is drawn from public sources, and what goes in a skill is a distribution decision, not only a context one.
- Dated facts go stale between refreshes. The skills carry their own last-checked dates for that reason, and the version is how a reader tells one refresh from another.

## Alternatives considered

- **Read skills from the repository only.** Enough for agents in a clone, and nothing for the Claude apps, which are half the audience.
- **Publish to a package registry.** Versioning and distribution for free, in the wrong shape: these are prose, nothing installs them as a dependency, and it adds an account and credentials for no gain over a release.
- **One release for the whole repository.** Fewer releases, and refreshing one skill forces a version on every other.
- **No versioning.** Nothing to remember to bump, and no way for a consumer to tell what they have or for the maintainer to tell whether a change shipped – for material full of dated facts, the whole problem.
- **A version derived from commits, as [ADR 007](007-version-with-calver-on-a-rebased-history.md) does for the project.** A skill's version tracks the freshness of its content rather than the project's cadence, and a refresh is a minor bump however many commits it took.
