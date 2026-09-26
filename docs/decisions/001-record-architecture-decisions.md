# 001. Record architecture decisions

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Campfire may outlive the 2027 jamboree it is built for, and whoever picks it up then needs to know why it is built the way it is, not only what was built. Reasoning left in commit messages, chat threads, or people's memory is lost when they fade.

## Decision

We record every significant architectural decision as an Architecture Decision Record – a numbered Markdown file under `docs/decisions`, one decision per file, following `template.md`. What an accepted record decided never changes – a decision that changes is superseded by a new record – but the record may be edited to make it clearer. The conventions are in [the index](index.md).

## Consequences

- The reasoning survives the people and the moment that produced it, so a contributor – human or agent – can learn why before changing what.
- Each record costs some writing, and that cost is what makes the trade-offs explicit.
- The log helps only while it is current, so writing the record is part of making the decision.
- Telling a clearer wording from a changed decision is a judgment call, so a reviewer checks it, and git keeps every earlier wording.

## Alternatives considered

- A single living description of the system – it says how things stand, but it is rewritten as the system changes, so it never keeps why.
- Commit messages and pull requests alone – they explain each change, but the reasoning ends up scattered across the history.
