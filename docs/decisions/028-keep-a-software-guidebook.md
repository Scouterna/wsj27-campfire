# 028. Keep a software guidebook

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Campfire is meant to be understandable years from now by people and agents who were not there when it was built. The decision log ([ADR 001](001-record-architecture-decisions.md)) records why each choice was made, and does not describe the system as a whole – its context, its containers, how work flows through it, the qualities it has to meet. A newcomer needs one current description, not a chronological log.

## Decision

We keep a software guidebook as the living description of the system, under `docs/guidebook/`, rendered as a browsable site.

- **It is rewritten to describe the system as it is designed now.** A change to how something works is not done until the page that describes it says so.
- **It does not duplicate what it sits above.** The decisions chapter is the front door to the log, and the process chapter points to `AGENTS.md`.

## Consequences

- A newcomer reads one description of the whole system rather than reconstructing it from records.
- The guidebook says how things are, and the records say why.
- A description that drifts from the system is worse than none, so keeping it accurate is part of the work.
- Pointing to the log and `AGENTS.md` costs the reader a click, and saves the contradictions duplication breeds.

## Alternatives considered

- A wiki or an external tool – outside the repository's review and history, and drifting from the code.
