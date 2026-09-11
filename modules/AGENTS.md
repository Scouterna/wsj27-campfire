# Modules

Read the [root `AGENTS.md`](../AGENTS.md) first – it holds the conventions that apply everywhere. This file is what is true of the feature modules under `modules/` – `authentication`, `home`, `journey`, and `participants` – the packages `apps/web` composes into the product. The reasoning is [ADR 016](../docs/decisions/016-compose-the-web-application-from-feature-modules.md), and the guidebook's [modules page](../docs/guidebook/architecture/modules.md) says what each one owns.

A module is one domain capability, whole: its data layer, its domain model, its screens, and its widgets. Four exist, and they are how the product grows – a new capability is a new module, not another folder inside an old one.

Every module is one screen deep today. There is no data layer, no domain model, no widget, and no route table anywhere under `modules/`: each package exports one component that draws the wordmark and a heading, and `apps/web` mounts one of the four – the home screen – which is what makes the workspace, the Vitest projects, the Playwright projects, and Storybook real before the features are. The rules below are in force for what exists, and each section says where it describes something no module holds yet.

## The one rule that carries the rest

**A module never imports another module.** A module depends on `libraries/*` and on third-party packages, and on nothing else in this repository. `apps/web` is the only place that knows them all, and it is where a fact from one module reaches another – as a prop, in the application's own types.

Two checks keep that true. A relative path into another module would otherwise resolve and work, so ESLint refuses it – `import-x/no-relative-packages` in `eslint.config.ts` rejects any relative import that crosses into another package. A package name cannot resolve at all, because a module is private and is nobody's declared dependency, so `pnpm check:types` fails on it.

When the rule feels restrictive, it is doing its job. If home needs to know whether the signed-in person is on the pre-trip, the application asks participants and hands home a boolean. Home never learns that participants exists.

## The shape of a module

Today a module is a package, a screen, its stories, a surface test, and a walk-through:

```text
modules/home/
├── package.json           @scouterna/wsj27-campfire-home, private, exports ./src/index.ts
├── src/
│   ├── index.ts           the public surface, and the only thing the application imports
│   ├── HomeScreen.tsx     the screen, with HomeScreen.stories.tsx beside it
│   └── index.test.ts      that the surface exports what the application mounts
└── test-ui/home.spec.ts   the Playwright walk-through
```

A screen sits directly in `src/` while a module has one of them. The shape a module grows into is the guidebook's [layers page](../docs/guidebook/architecture/layers/index.md), and it arrives a directory at a time, when there is something to put in each:

```text
modules/<name>/src/
├── data/         query-option factories, one per endpoint
│   └── dto/      the wire shapes, every field typed unknown, and their converters
├── model/        the domain types and their pure functions
├── ui/
│   ├── screens/  one directory per screen
│   └── widgets/  one directory per widget, each augmenting WidgetRegistry
├── storybook/    the decorators and fixtures the module's own stories need
└── index.ts      the public surface – everything else is internal
```

- Each package is named `@scouterna/wsj27-campfire-<name>`, is `private`, is `"type": "module"`, carries the repository's version, and exports `./src/index.ts` and nothing else. There is no build step: Vite compiles the raw TypeScript together with the application.
- A dependency is pinned exactly, and a release younger than three days will not install ([ADR 005](../docs/decisions/005-pin-every-dependency-and-let-new-releases-age.md)). Adding one is a decision to raise, not a step in a plan.
- A module imports `libraries/*`, React, and third-party packages. Never an app, and never another module.

## The public surface

`src/index.ts` is a deliberate, narrow list, opening with a JSDoc block saying what the module hands out. Domain types, queries, and screens stay internal unless the application genuinely needs them – anything reaching for a domain type is reaching past the boundary rather than through it. Today each module exports exactly one screen.

Three kinds of thing leave a module, and two of them wait on machinery `libraries/ui` does not hold yet ([Navigation and routing](../docs/guidebook/architecture/layers/navigation.md), [Presentation layer](../docs/guidebook/architecture/layers/presentation.md)):

- **Routes** – augment `RouteRegistry` with each address the module owns, branded `Address<"<module>">`, and export a `Routes` table the application spreads into its own. The brand is what makes two modules claiming one path a compile error rather than a race the later import wins. Write the table with `satisfies`, never a type annotation: annotating widens the keys to every address the application knows, and the router stops knowing which ones this module answers at.
- **Widgets** – augment `WidgetRegistry` in the widget's own file, and export a widget table. Ids read `module:widget`, for example `participants:unit-leaders`. An id registered in the type system but absent from the build renders nothing, which is the honest behavior for a build assembled without that module.
- **Doorways** – a named hook or component for a fact another part of the product needs, such as how the signed-in person travels. A doorway is a promise, so add one when the application is about to walk through it, not before.

Registration, not import, is how a module reaches the application. The application spreads the tables; it never reaches inside one.

## Data at the boundary

Nothing under `modules/` fetches anything today. TanStack Query is decided and not installed ([ADR 017](../docs/decisions/017-route-and-load-data-with-tanstack-router-and-query.md)), and `libraries/utils` exports one string helper rather than the fetch wrapper this rests on. The [mock](../tools/mock/AGENTS.md) already serves the register and the gates, so what is missing is the client half. When it lands, it lands this way ([Data layer](../docs/guidebook/architecture/layers/data.md)):

- **Every DTO field is typed `unknown`**, and a converter beside it validates the payload into the domain type. Declaring a field `string` is a promise the module cannot keep about a service that will change shape over an eighteen-month build.
- **A bad row in a list is dropped, not thrown.** One broken record must not empty the register a leader is standing in a field trying to read. A detail fetch is the opposite case: one payload, so a payload that does not convert is a screen saying the person could not be loaded.
- **A DTO never leaves `data/`.** Nothing above it sees a wire field name, which is what makes an upstream rename stop at the converter.
- **Query options live in `data/`** as factories returning TanStack Query `queryOptions` with stable key arrays. The screens call the hooks; the factories are the only thing in a module that knows a URL.
- **Every URL is origin-relative** ([ADR 012](../docs/decisions/012-run-campfire-in-three-environments-on-one-origin.md)), so a module never learns which environment it is running in. The 403 the participants service answers a caller who may see a person but not their health answers is load-bearing: it is the signal to retry the same person at the basic level, and telling it from a 404 is the difference between a second request and a wrong screen.
- **Long lists are virtualized** ([ADR 017](../docs/decisions/017-route-and-load-data-with-tanstack-router-and-query.md)). The contingent is over two and a half thousand people, and a register screen draws the rows that fit.

## Stories and tests

- Every component gets stories beside it as `Name.stories.tsx` ([ADR 023](../docs/decisions/023-catalog-the-ui-in-storybook.md)). Storybook indexes `modules/*/src/**/*.stories.tsx` and groups them under `Modules/<Module>/…` by the story's `title` rather than by its folder, so moving a file does not move the sidebar. Nothing in Storybook touches a network.
- A module's screens are proven by the Playwright walk-through in its `test-ui/` rather than by rendering tests ([ADR 024](../docs/decisions/024-walk-through-the-web-application-per-module-with-playwright.md), [UI tests](../docs/guidebook/testing/ui.md)). `test-ui` rather than `test`, because that is what the two shells already call the suites that drive a running application.
- Unit tests are `*.test.ts` beside what they cover, run by Vitest ([ADR 022](../docs/decisions/022-test-typescript-with-vitest.md)). Each module has a hand-written project in [`config/vitest/vitest.config.ts`](../config/vitest/vitest.config.ts), in a Node environment, and a module's tests do not run until it is listed there.
- The modules stay outside the coverage denominator on purpose. The ratchet measures the two libraries with logic in them and the mock, because screens are proved by walking them.
- Today each module's test asserts that the surface exports the screen the application mounts, and each walk-through asserts that the root address answers in a real browser. Both grow with the screens.

## Adding a module

A module is in seven places, and six of them are hand-written lists that fail loudly or quietly when they disagree:

1. The directory here, with its `package.json`.
2. A `workspace:*` dependency in `apps/web/package.json`.
3. A project in [`config/vitest/vitest.config.ts`](../config/vitest/vitest.config.ts), or its tests never run.
4. A project in [`config/playwright/playwright.config.ts`](../config/playwright/playwright.config.ts).
5. The same name in the `module` matrix in [`.github/workflows/test_web.yml`](../.github/workflows/test_web.yml) – a module in one and not the other either runs nowhere or fails with "no project named X".
6. A `COPY` of its `package.json` in the install layer of [`config/environments/prod/Dockerfile`](../config/environments/prod/Dockerfile), or the image installs without the module's dependencies.
7. A `node_modules` mask, and the volume behind it, in [`config/environments/dev/compose.yaml`](../config/environments/dev/compose.yaml), or the host's macOS binaries break the install inside the container.

## Before handing work back

Run `pnpm test` and the four checks – `check:format`, `check:lint`, `check:markdown`, `check:types` – as separate commands, so one pass reports every failure. A change here also builds the web application and Storybook in continuous integration, so run `pnpm build:web` and `pnpm build:storybook` when you touched anything a story or the application imports, and `pnpm test:web:ui --project=<module>` when you touched a screen.
