# 002. Organize as a single monorepo

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Campfire is a web application, two native shells that host it, the libraries and feature modules they are built from, the tooling around them, and the documentation. These pieces change together and reference each other constantly, and which of them are generic and which belong to this event is not settled, so there is no line yet to split repositories along.

## Decision

We keep Campfire in one repository, managed as a pnpm workspace, with one top-level home for each kind of thing:

- `apps/` – the web application and the Android and Apple shells that host it
- `libraries/` – generic packages that know no feature
- `modules/` – feature modules, each a domain capability
- `tools/` – development tooling that ships to nobody
- `config/` – shared tooling configuration, one directory per tool
- `scripts/` – the scripts the `pnpm` scripts run
- `docs/` – the decisions, the guidebook, and the architecture model
- `.agents/`, `.githooks/`, and `.github/` – the agent material, the git hooks, and what GitHub reads

Packages are named `@scouterna/wsj27-campfire-<name>`. The back-end services live in their own repositories.

## Consequences

- A change across an app, a module, and a library is one branch, one review, and one history.
- Tooling and dependency resolution are shared, so configuration is written once.
- The layout decides where new work goes.
- The repository grows heavier and mixes concerns that may one day belong apart. The top-level homes are the seams a stable part can be lifted out along.

## Alternatives considered

- A repository per app, library, and module – clean isolation, at the cost of coordinating versions across repositories before the boundaries are known.
- A monorepo with a flat layout – simpler at first, but with no home for each kind of thing and no seams to extract along later.
