# 013. Keep the back-end services in their own repositories

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Every screen that shows real data depends on services behind the back-end paths ([ADR 012](012-run-campfire-in-three-environments-on-one-origin.md)). Those services are written and run by the people who own them, not by this repository.

## Decision

We keep the back-end services out of this repository. Each back-end lives in its own repository – `wsj27-auth-api` and `wsj27-project-api` – and chooses its own language, toolchain, checks, and release cadence, recording its own decisions. Campfire uses a back-end only through its prefix under `/api/`.

## Consequences

- The contract between the front-end and a back-end is kept in step by hand, and a change across it is two pull requests, in order.
- The mock is the front-end's only picture of the back-ends, and it drifts from them.
- No single clone holds the whole system. `config/environments/` assembles it.
- A decision that shapes the product is recorded here even when the code it shapes lives elsewhere.
