# 016. Compose the web application from feature modules

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

::: warning A later record moved part of this
[ADR 032](032-hold-the-signed-in-person-in-utils.md) supersedes two statements below: a fact two modules share no longer travels through the application as a prop, and the signed-in user is one type in `utils` rather than a shape each module writes for itself. Everything else here stands.
:::

## Context

[ADR 002](002-organize-as-a-single-monorepo.md) gave `apps/`, `libraries/`, and `modules/` their meaning and said nothing about how a module is shaped, what it may reach for, or how its screens end up in the application. That is the part a compiler can be made to enforce, and two forces make enforcing it worth more than agreeing on it. A large share of this code is written by agents, and an agent that can import something will import it – review attention is the scarce resource ([ADR 006](006-lint-and-format-with-a-shared-strict-toolchain.md)), and a boundary the compiler holds costs no review at all. And the feature scope is open: whatever Campfire turns out to be for the management team arrives as more modules, so adding one has to be a small, local act. And the parts most likely to survive into a later event – a design system, a bridge, a set of utilities – are exactly the parts that must not learn anything about this jamboree's features.

## Decision

We compose the web application from feature modules over shared libraries, with one composition root and no module ever importing another.

- **A module is a domain capability; a library is generic.** The test is what a package knows: a library that knows a feature is a module in the wrong place. `libraries/ui` knows about screens, widgets, and themes; it does not know that participants exist.
- **A module never imports another module.** Modules depend on `libraries/*` and nothing else in the workspace. When two features need the same fact, it travels through the application as a prop.
- **`apps/web` holds the only composition root**, where the modules' route tables and widget tables are merged and the session gate decides whether anything is drawn. Nothing else in the repository knows the full set of modules.
- **Modules register; they are not imported by their consumers.** A module declares its addresses into the `RouteRegistry` interface and its widgets into `WidgetRegistry` from its own source, and a screen shows another module's contribution by id. An unregistered id renders nothing, which is the honest behavior for a build assembled without that module.
- **A module's public surface is a short list of doorways** – its routes, its widgets, and a few hooks. It exports no screens, no queries, and no domain types; anything reaching for a `Participant` is reaching past the boundary rather than through it.
- **Packages export raw TypeScript source** from `src/index.ts`, all `private`, and Vite compiles the whole graph at once ([ADR 014](014-build-the-web-application-on-react-with-vite.md)).

## Consequences

- Every cross-module fact costs a prop threaded by hand through the composition root, so coupling shows up as a line in the one file that gets the most attention instead of as an import nobody reads.
- Some shapes are written twice – home's idea of the signed-in user is not authentication's type. The day the same fields are declared in a fourth module, the answer is a library, not a shortcut between modules.
- Type-level registration is invisible machinery. An address exists only because a module augmented an interface, and a module the application does not depend on registers nothing. It is not obvious, and it will confuse somebody new.
- A widget id is a string contract, so a typo renders nothing instead of failing, and nothing distinguishes a misspelling from an optional module that is absent.
- Raw-source exports mean no package can be consumed outside this workspace. The day something is extracted along ADR 002's seam, it needs a build step and a version this arrangement does not have.

## Alternatives considered

- **One flat application package.** No registries, no augmentation, no boundary to explain – and by the second week every feature imports every other one, because nothing stops it.
- **Modules as versioned, published packages.** The extraction ADR 002 anticipates, done up front. It buys independent release cadences nothing here wants, and costs version skew between packages that always ship together in one image.
- **Module federation, or a build per module.** A real answer to one large team with many deploy trains. Campfire has two people and one artifact.
- **A shared `core` library for the cross-cutting domain types.** The obvious way to let two modules speak about a participant, and the shape every codebase regrets: `core` becomes where anything ambiguous lands, and within a year every module depends on all of it.
- **Deep imports instead of a single entry point.** Reaching straight into another package's `src/` removes the need to design a public surface, and with it the only thing that makes a module's boundary reviewable.
