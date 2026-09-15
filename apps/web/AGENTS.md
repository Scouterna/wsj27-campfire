# Web application

Read the [root `AGENTS.md`](../../AGENTS.md) first – it holds the conventions that apply everywhere. This file is what is true only of `apps/web`, the React application that is the product. What the application is, and why it is shaped this way, is the guidebook's [Applications](../../docs/guidebook/architecture/applications.md) page; this file is the part you need with your hands on the code.

`apps/web` is the whole product. Every screen a leader or a CMT member sees is built here once, and the native shells host it ([ADR 010](../../docs/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells.md)). It is React 19 on Vite ([ADR 014](../../docs/decisions/014-build-the-web-application-on-react-with-vite.md)), composed from feature modules ([ADR 016](../../docs/decisions/016-compose-the-web-application-from-feature-modules.md)), and is to be routed and loaded by TanStack Router and Query ([ADR 017](../../docs/decisions/017-route-and-load-data-with-tanstack-router-and-query.md)).

## Layout

**It is the composition root** – the only place that knows every module – so a fact that travels from one module to another travels through here, as a prop. The application itself is thin, because the screens belong to the modules:

```text
apps/web/
├── index.html    the document: the cascade layer order, the icons, the stylesheet link, and the module script
├── package.json  the modules and libraries it composes, as workspace dependencies
├── assets/       served verbatim – the favicon, the app icons, the PWA's images
└── src/
    ├── main.tsx            the boot order before React: the theme stamp, the bfcache reload, the mount
    ├── RequireSession.tsx  the session gate – the sign-in screen, or the signed-in application
    ├── query.ts            the one query client, with ADR 017's recorded defaults
    └── app.css             the page frame, and the one import of the design system's stylesheet
```

The design is six files in `src/`: `routes.tsx` for the tables, the gate, and the chromes; `main.tsx` for the boot order before React; `navigation.ts` for the navigation memory; `outline.tsx` for the desktop outline column; `query.ts` for the query client and its persister; and `app.css`. Today `src/` holds four – the gate lives as its own `RequireSession.tsx` until the router's `AppChrome` absorbs it, and `query.ts` carries no persister yet – so the routing and chrome sections below are the design to build to rather than a description of the tree.

Everything else is a module or a library. See [`modules/AGENTS.md`](../../modules/AGENTS.md) and [`libraries/AGENTS.md`](../../libraries/AGENTS.md), and the guidebook's [Code organization](../../docs/guidebook/architecture/code-organization.md) for how the three divide the work.

Every module and library it composes is a `workspace:*` dependency in its `package.json`, named `@scouterna/wsj27-campfire-<name>`, and resolved to raw TypeScript source – nothing is built between a module and the application. Vite's configuration is [`config/vite/vite.config.ts`](../../config/vite/vite.config.ts), kept in `config/` with every other tool's and run with `--config`; it serves `assets/` as the public directory, builds into `apps/web/.build`, and holds the dev server to port 3000 with `strictPort`.

## The composition root

`src/routes.tsx` is to be the only file that knows every module, which is what lets no module know another ([ADR 016](../../docs/decisions/016-compose-the-web-application-from-feature-modules.md)). Two tables carry that:

- `screens` – the application's own `/` and `/profile`, plus each module's exported route table spread in
- `widgets` – each module's exported widget table spread in, handed to `WidgetsProvider`

Follow the shape when you add to it.

**A new screen** belongs to the module that owns its data. The module augments `RouteRegistry` with its address, branded `Address<"module">`, exports a `Routes` table, and the application spreads it into `screens`. Two modules claiming one path is a compile error, which is the point. Only `/` and `/profile` are the application's own, because the session belongs to no module. [Navigation and routing](../../docs/guidebook/architecture/layers/navigation.md) has the four fields a route entry carries and why the table is keyed by path.

**A new widget** is registered the same way: the providing module augments `WidgetRegistry` in the widget's own file, exports it in its widget table, and a screen draws it with `<Widget id="module:name" />`. An unregistered id renders nothing, which is the honest behavior for a build assembled without that module.

**A cross-module fact travels as a prop.** The home screen shows a countdown and a unit's people without knowing the journey or participants modules – the application reads the hook and hands the value down. If a module needs another module's type, the composition is wrong, not the rule.

Today there is no router and no table: `main.tsx` mounts the session gate, and the gate mounts the home screen at no address at all.

## The gate and the two chromes

`AppChrome` is to be the router's `InnerWrap` and the session gate. It asks the auth service who is signed in, calls `adoptCacheOwner(memberNo)` before any screen mounts, renders nothing until the service answers, and then branches once on `host.tier`:

- `ShellChrome` draws no chrome at all. Its job is the bridge conversation: reporting the session, the theme name, and the current screen, and subscribing to what the native bars send back ([ADR 018](../../docs/decisions/018-bridge-the-web-application-and-the-shells-with-versioned-messages.md)).
- `BrowserChrome` draws the side menu, the navigation bar, the content column, the outline, and the tab strip.

The branch is computed before the first render, so chrome belonging to the other tier is never briefly visible. `canGoBack` comes from the route's declared `parent`, never from `history.length` – that lies after a cold deep link. [Presentation layer](../../docs/guidebook/architecture/layers/presentation.md) describes the gate's order and why nothing renders before the answer.

Until the router lands, the gate is `RequireSession`: it asks `currentUser(queryClient)` once per page load, renders nothing until the answer, and then mounts the sign-in screen in the remembered theme or the signed-in application – the theme resolved unit-first, the roles made ambient through `RolesProvider`, and the greeting handed to home as props. That is the contract `AppChrome` inherits.

`libraries/host` already answers which tier the application is in. It reads the `CampfireShell` token off the User-Agent once, at module evaluation, and freezes the answer – so there is no message to wait for. It carries no messages yet; the bridge's web half lands beside it.

## Data, the cache, and the network

- Fetch origin-relative paths only. The application never knows which environment it is running in, and there is no environment switch in the front-end ([ADR 012](../../docs/decisions/012-run-campfire-in-three-environments-on-one-origin.md)).
- Query defaults in `src/query.ts` are set for a field in Poland: `staleTime` 24 hours, `gcTime` 30 days, `networkMode: "offlineFirst"`, and no refetch on mount, focus, or reconnect. Do not override them per query without a reason worth writing down.
- Persistence is per query, into IndexedDB, rather than one serialized snapshot of the whole cache. When a cached payload's shape changes, bump the store's buster – a stale shape read as a fresh one is worse than a cold cache.
- `adoptCacheOwner` wipes both the in-memory client and the store when the signed-in member number changes. A leader's cached health answers must never survive to the next sign-in on a shared device.

The client and its defaults are real: `src/query.ts` holds the one `QueryClient`, and **every service read goes through it** – the gate hands it to `currentUser`, and a screen's hooks mount it in a provider the day the first one arrives. The utils `fetch` is the transport inside a query function, never a path around the cache. Persistence and `adoptCacheOwner` are still design ahead of the tree. [Data layer](../../docs/guidebook/architecture/layers/data.md) is the whole design, down to the DTO boundary the authentication module already validates at.

## Styles, themes, and the PWA

- The cascade layers are declared in `index.html` before any stylesheet loads – `@layer tokens, fonts, reset, base, component, screen` – so stylesheet order never matters anywhere else. `app.css` is linked from the document rather than imported from TypeScript, so `tsc` never has to resolve CSS.
- `src/app.css` owns the page frame and nothing else: the one import of `@scouterna/wsj27-campfire-ui/styles.css`, and the centered reading column. What a piece looks like belongs to `libraries/ui`. The view-transition choreography lands here too, keyed off the direction the navigation listener writes onto the document.
- No inline `style` props. Font sizes go through `calc(<N>rem / 17)`, against the 17-point base the design system sets, so Dynamic Type carries the reader's own text size.
- A theme is a name, not a stylesheet – `blue`, `brown`, `green`, `red`, or `yellow`, resolved once above the screens and written to `data-theme`. `applyInitialTheme` stamps the remembered or requested one before React boots, and the gate resolves the signed-in one: the unit's color, the management's red, or the remembered theme. Never send a color over the bridge; the shells hold their own palette per name.
- `vite-plugin-pwa` generates the manifest and an `autoUpdate` service worker that precaches the built shell. Navigations under `/api/` stay off the fallback, because sign-in and sign-out are full-page navigations to the auth service and a precached shell served in their place breaks them.
- The document is Swedish (`lang="sv"`), and so is every word a user reads.

## Commands

| Command                | What it does                                                       |
| ---------------------- | ------------------------------------------------------------------ |
| `pnpm start:local`     | The whole stack on `http://localhost:8000`, with the mock back-end |
| `pnpm start:web`       | The dev server alone, on port 3000                                 |
| `pnpm build:web`       | Build into `apps/web/.build`                                       |
| `pnpm start:storybook` | Storybook – every component, widget, and screen – on port 3002     |
| `pnpm test`            | The TypeScript tests, across every package that has them           |
| `pnpm test:web:ui`     | The Playwright walks – they start the dev server, or reuse one     |

`start:web` serves the application alone, so the back-end paths answer nothing; `start:local` is what puts the mock behind them on the one origin the shells also use.

## Conventions

- The application composes, and never implements. A screen, a widget, and the state behind them belong to a module; `src/` mounts what the modules export and passes anything that crosses a module boundary down as a prop.
- React 19 function components in TypeScript, one component per file, named after it. A component takes one `props` object typed as a named `XxxProps` type, every field `readonly` and every field documented.
- The screens are proven by the Playwright walks in each module's `test-ui/` rather than by unit tests, and by Storybook for the pieces ([ADR 024](../../docs/decisions/024-walk-through-the-web-application-per-module-with-playwright.md), [ADR 023](../../docs/decisions/023-catalog-the-ui-in-storybook.md)). A change to a screen ends with `pnpm test:web:ui`. [UI tests](../../docs/guidebook/testing/ui.md) says how the suite runs and what it cannot reach yet.
- There is no Vitest project for `apps/web`. Adding the first test here means adding a project entry to [`config/vitest/vitest.config.ts`](../../config/vitest/vitest.config.ts) – the list is hand-written on purpose, so a glob never decides what runs.
- A new module is also a project in [`config/playwright/playwright.config.ts`](../../config/playwright/playwright.config.ts) and a leg in the `module` matrix in `.github/workflows/test_web.yml`. A module in one and not the other either runs nowhere or fails with "no project named X".
- A change here passes `pnpm test` and the four checks – `check:format`, `check:lint`, `check:markdown`, `check:types` – run as separate commands. `build_web.yml` builds the application and Storybook on the pull request, so a story that no longer bundles fails the build.
- Read the [architecture chapter](../../docs/guidebook/architecture/index.md) before a change that moves a boundary. It describes the first version as built, so read the code beside it for what exists.
