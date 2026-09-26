# 016. Compose the web application from feature modules

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

::: warning A later record moved part of this
[ADR 032](032-hold-the-signed-in-person-in-utils.md) changes course for the signed-in person. Under this record it belongs to the authentication module and reaches other modules as a prop; ADR 032 moves it into `utils`, where any module reads it with `useUser`. Everything else here stands.
:::

## Context

[ADR 002](002-organize-as-a-single-monorepo.md) gave `apps/`, `libraries/`, and `modules/` their meaning, but not how a module is shaped, what it may reach for, or how its screens reach the application. Much of the code is written by agents, and an agent that can import something will – a boundary the compiler holds costs no review ([ADR 006](006-lint-and-format-with-a-shared-strict-toolchain.md)). New features arrive as modules, so adding one has to be small and local, and the parts likely to outlive this jamboree – the design system, the bridge, the utilities – must not learn its features.

## Decision

We compose the web application from feature modules over shared libraries, with one composition root and no module importing another.

- **A module is a domain capability; a library is generic.** A library that knows a feature is a module in the wrong place.
- **A module never imports another module.** Modules depend on `libraries/*` and nothing else in the workspace, and a fact two features share travels through the application as a prop.
- **`apps/web` holds the only composition root**, where the modules' route and widget tables are merged and the session gate decides whether anything is drawn.
- **Modules register rather than being imported.** A module declares its addresses into `RouteRegistry` and its widgets into `WidgetRegistry`, and a screen shows another module's widget by id. An unregistered id renders nothing.
- **A module's public surface is a short list of doorways** – its routes, its widgets, and a few hooks – and no screens, queries, or domain types.
- **Packages export raw TypeScript source** from `src/index.ts`, and Vite compiles the whole graph at once ([ADR 014](014-build-the-web-application-on-react-with-vite.md)).

## Consequences

- Coupling shows up in the composition root, the file that gets the most attention, not as an import nobody reads.
- Some shapes are written more than once, and the answer to that is a library, never a shortcut between modules.
- Registration is invisible machinery: an address exists only because a module augmented an interface.
- A widget id is a string contract, so a typo renders nothing instead of failing.
- No package can be consumed outside this workspace without a build step of its own.

## Alternatives considered

- One flat application package – nothing stops every feature importing every other.
- Modules as versioned, published packages – version skew between packages that always ship together.
- Module federation, or a build per module – an answer for many teams with many deploy trains, not one artifact.
