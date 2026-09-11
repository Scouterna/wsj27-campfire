# 001. Record architecture decisions

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Campfire is built on architectural decisions made explicitly and written down. The project is early, most of its decisions are still ahead of it, and it may well outlive the 2027 jamboree it is built for, reused for later events. Whoever picks it up then needs to understand not just what was built, but why. Reasoning that lives only in commit messages, chat threads, or people's memory is lost as soon as those fade.

## Decision

We record every significant architectural decision as an Architecture Decision Record: a numbered Markdown file under `docs/decisions`, one decision per file, following `template.md`. Each ADR captures the context, the decision, its consequences, and the alternatives that lost. An accepted ADR is immutable – a decision that changes is superseded by a new ADR rather than edited in place. The conventions are described in [the ADR index](index.md).

## Consequences

- The reasoning behind the system survives the people and the moment that produced it, which matters for a project meant to be handed over.
- New contributors – human and agent – can read the log and understand why things are the way they are before they change them.
- Each significant decision carries a small writing cost. That cost is the point: it forces the trade-offs to be made explicit.
- The log only helps if it is kept current, so recording an ADR is part of making a decision, not an afterthought.

## Alternatives considered

- **Keep a single living description of the system instead.** A document that is kept current tells you how things stand today, but it is rewritten as the system evolves, so it never preserves why anything changed. A decision log is the immutable layer beneath any such description, not a substitute for it.
- **Rely on commit messages and pull requests.** These explain individual changes, but the reasoning ends up scattered and hard to find later. A dedicated, numbered log is discoverable in one place.
- **Do not record decisions at all.** Fastest in the moment, but it guarantees the "why" is lost – exactly the failure this project is trying to avoid.
