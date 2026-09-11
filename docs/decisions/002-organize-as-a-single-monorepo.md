# 002. Organize as a single monorepo

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Campfire is a web application, two native shells that host it, the libraries and feature modules they are built from, the tooling around them, and the documentation. Those pieces could live in one repository or in many. Early on they change together and reference each other constantly, and it is not yet clear which parts are generic and which are specific to this event – so the boundaries between them are not something a repository split could be drawn along yet.

## Decision

We organize Campfire as a single monorepo, managed as a pnpm workspace, where each kind of thing has one top-level home:N

- `apps/` – the deployable apps: `web`, and the `android` and `apple` shells that host it.
- `libraries/` – generic, reusable packages, which know nothing about any feature.
- `modules/` – feature modules, each a domain capability.
- `tools/` – development tooling that ships to nobody, such as the mock back-end.
- `config/` – shared tooling configuration, one directory per tool.
- `scripts/` – every script the `pnpm` scripts run.
- `docs/` – the decisions, the guidebook, and the architecture model.
- `.agents/` – the agent definitions, the skills, and the per-branch spec scratch.
- `.githooks/` and `.github/` – the committed git hooks, and everything GitHub reads.

Packages are named `@scouterna/wsj27-campfire-<name>`. The repository holds the front-end and the ground it shares; the back-end services are not in it.

## Consequences

- A change that spans an app, a module, and a library is one branch, one review, and one history.
- Tooling and dependency resolution are shared, so configuration is written once rather than per package.
- Each kind of thing has an obvious home, so the layout decides where new work goes.
- One repository grows heavier over time and mixes concerns that may one day belong apart. The folder boundaries are drawn so a stable part can be lifted out later with its seams already in place.

## Alternatives considered

- **A repository per app, library, and module.** Cleaner isolation and independent histories, at the cost of cross-repository coordination and version juggling before the boundaries are even known.
- **A monorepo with a flat layout.** Simpler on day one. It loses the home for each kind of thing and blurs the seams an extraction will later need.
