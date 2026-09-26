# Modules

Read the [root `AGENTS.md`](../AGENTS.md) first. This file is what is true only of the feature modules under `modules/`, the packages `apps/web` composes into the product ([ADR 016](../docs/decisions/016-compose-the-web-application-from-feature-modules.md)). What each one owns is the guidebook's [Modules](../docs/guidebook/architecture/modules.md) page.

A module is one domain capability, whole – its data layer, its domain model, its screens, and its widgets. A new capability is a new module, not another folder inside an old one.

## A module never imports another module

A module depends on `libraries/*`, React, and third-party packages, and on nothing else in the repository. `apps/web` is the only package that knows them all, and it only composes.

- ESLint's `import-x/no-relative-packages` refuses a relative path into another package, and `pnpm check:types` fails on a module's package name, because a module is nobody's declared dependency.
- When the rule gets in the way, the answer is a library, never the application. A hook a module needs and cannot reach is in the wrong package – move it to a library rather than moving the logic into `apps/web`.

## The shape of a module

A module grows into the guidebook's [Layers](../docs/guidebook/architecture/layers/index.md) a directory at a time, when there is something to put in each:

```text
modules/<name>/
├── package.json    @scouterna/wsj27-campfire-<name>, private, exports ./src/index.ts
├── src/
│   ├── data/         query-option factories, one per endpoint
│   │   └── dto/      the wire shapes, every field typed unknown, and their converters
│   ├── model/        the domain types and their pure functions
│   ├── ui/
│   │   ├── screens/    one directory per screen
│   │   ├── widgets/    one directory per widget, each augmenting WidgetRegistry
│   │   ├── components/ one directory per component more than one of the module's screens uses
│   │   └── storybook/  the decorators and fixtures the module's own stories need
│   ├── routes.tsx    the route table, for a module that answers at addresses
│   ├── widgets.ts    the widget table, for a module that fills widget ids
│   └── index.ts      the public surface – everything else is internal
└── test-ui/        the Playwright walk-through
```

A screen sits directly in `src/` while the module has only one.

## The public surface

`src/index.ts` opens with a JSDoc block saying what the module hands out. A module exports its route table and its widget table; anything else leaves only where the application needs it, with the reason in that block. Domain types, queries, and screens stay internal – anything reaching for a domain type is reaching past the boundary ([Navigation and routing](../docs/guidebook/architecture/layers/navigation.md), [Presentation layer](../docs/guidebook/architecture/layers/presentation.md)).

- **Routes** – augment `RouteRegistry` with each address, branded `Address<"<module>">`, so two modules claiming one path is a compile error. Write the table with `satisfies`, never an annotation, which would widen the keys to every address in the application.
- **Widgets** – augment `WidgetRegistry` in the widget's own file with an id reading `module:widget`, branded `WidgetFrom<"<module>">`, and export the table from `src/widgets.ts` with `satisfies`. A widget takes no props; it reads what it needs from its own queries or the ambient session. The screen that places it owns who sees it.
- **Doorways** – a named hook or component for a fact another part of the product needs. A fact about the signed-in person is a field on `User` instead, read with `utils`' `useUser`. A doorway is a promise, so add one only when the application is about to use it.

## Data at the boundary

The whole design is [Data layer](../docs/guidebook/architecture/layers/data.md). The rules a change here is held to:

- **Every service read goes through the application's one query client** ([ADR 017](../docs/decisions/017-route-and-load-data-with-tanstack-router-and-query.md)). A factory in `data/` returns `queryOptions` with a stable key; the utils `fetch` is the transport inside it. A read that calls `fetch` directly is wrong even when it works, because nothing caches, deduplicates, or owns it.
- **The factories are the only thing that knows a URL**, and every URL is origin-relative ([ADR 012](../docs/decisions/012-run-campfire-in-three-environments-on-one-origin.md)).
- **One model type per thing, and it is ours.** The converter fills it whole, derivations included. Two types for one thing means a converter stopped halfway.
- **Every DTO field is typed `unknown`**, and a converter beside it validates the payload. A DTO never leaves `data/`, so an upstream rename stops at the converter.
- **A bad row in a list is dropped, not thrown**, because one broken record must not empty a leader's list. A detail that does not convert is a screen saying the person could not be loaded.
- **A 403 is not a 404.** The participants service answers 403 to a caller who may see a person but not their health answers, and that is the signal to retry at the basic level.
- **A hook is presentation.** It lives in `ui/`, beside its screen or at `ui/` root as a doorway, never in `data/`.
- **A long list is virtualized**, drawing only the rows that fit.

## Stories and tests

- A module's stories group under `Modules/<Module>/…` by their `title`, not their folder, so moving a file does not move the sidebar.
- A module's screens are proven by the walk-through in `test-ui/`, not by rendering tests ([ADR 024](../docs/decisions/024-walk-through-the-web-application-per-module-with-playwright.md)). A change to a screen ends with `pnpm test:web:ui --project=<module>`.
- Unit tests are `*.test.ts` beside what they cover, in the module's own project in [`config/vitest/vitest.config.ts`](../config/vitest/vitest.config.ts) ([ADR 022](../docs/decisions/022-test-typescript-with-vitest.md)). A module's project starts listed and empty, so its first real test runs the moment it exists. A test that only asserts an export proves nothing the type checker does not.
- The modules stay out of the coverage ratchet, because screens are proven by walking them.
- Run `pnpm build:web` and `pnpm build:storybook` for a change a story or the application imports – continuous integration builds both.

## Adding a module

A module is in all of these places, and every one but the first is a hand-written list that fails loudly or quietly when it disagrees:

1. The directory here, with its `package.json`.
2. A `workspace:*` dependency in `apps/web/package.json`.
3. A project in [`config/vitest/vitest.config.ts`](../config/vitest/vitest.config.ts), or its tests never run.
4. A project in [`config/playwright/playwright.config.ts`](../config/playwright/playwright.config.ts).
5. The same name in the `module` matrix in [`.github/workflows/test_web.yml`](../.github/workflows/test_web.yml). A module in one and not the other runs nowhere or fails with "no project named X".
6. A `COPY` of its `package.json` in the install layer of [`config/environments/prod/Dockerfile`](../config/environments/prod/Dockerfile), or the image installs without its dependencies.
7. A `node_modules` mask, and the volume behind it, in [`config/environments/dev/compose.yaml`](../config/environments/dev/compose.yaml), or the host's macOS binaries break the install inside the container.
