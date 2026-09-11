# 028. Keep a software guidebook

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Campfire is meant to be understandable years from now, by people and agents who were not there when it was built. The decision log ([ADR 001](001-record-architecture-decisions.md)) records the immutable why behind each choice, and it does not describe the system as a whole – its context, the containers it is built from, how work flows through it, the qualities it has to meet. Someone new needs one current description of what Campfire is and how it fits together, not a chronological log of the choices that got it there.

## Decision

We keep a software guidebook as the living description of the system, under `docs/guidebook/`, rendered as a browsable site.

- **It is organized into chapters**, each a directory with an index page, and it grows as the system does.
- **It is rewritten to describe the system as it is now.** Unlike a record, a guidebook page is not immutable: a change to how something works is not done until the page that describes it says so.
- **It does not duplicate the durable records it sits above.** The decisions chapter is the front door to the log rather than a copy of it, and the process chapter points to `AGENTS.md` rather than restating it.

## Consequences

- A newcomer reads one coherent description of the whole system instead of reconstructing it from a log of individual decisions.
- The guidebook and the log divide the work: the guidebook says how things are, the records say why. Neither does the other's job.
- A living document only helps while it is current, and a description that drifts from the system is worse than none. Keeping it accurate is part of doing the work, not an afterthought.
- Fronting the log and `AGENTS.md` instead of restating them costs the reader an indirection, and saves the contradictions duplication breeds.

## Alternatives considered

- **The decision log alone.** It captures every decision and never describes the system as a whole, so a reader assembles the big picture from a chronological log – exactly the gap the guidebook fills.
- **A README.** A single file does not scale to context, architecture, process, testing, and the rest, and it blurs the audiences.
- **A wiki or an external tool.** It drifts from the code, sits outside the repository's review and history, and is one more place to keep in sync. Markdown in `docs/` is beside the code it describes and under the same review.
