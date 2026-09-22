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
    ├── main.tsx        the boot order before React: the theme stamp, the navigation wiring, the bfcache reload, the mount
    ├── routes.tsx      the tables, the sections, the gate, and the two chromes
    ├── navigation.ts   the navigation memory: direction, trails, and scroll restoration
    ├── outline.tsx     the desktop outline column, read from the page as rendered
    ├── query.ts        the one query client, with ADR 017's recorded defaults
    └── app.css         the chrome layout, the view transitions, and the one import of the design system's stylesheet
```

The six files are the design's: `routes.tsx` for the tables, the gate, and the chromes; `main.tsx` for the boot order before React; `navigation.ts` for the navigation memory; `outline.tsx` for the desktop outline column; `query.ts` for the query client, its per-query IndexedDB persister, and the cache-owner handover; and `app.css`.

Everything else is a module or a library. See [`modules/AGENTS.md`](../../modules/AGENTS.md) and [`libraries/AGENTS.md`](../../libraries/AGENTS.md), and the guidebook's [Code organization](../../docs/guidebook/architecture/code-organization.md) for how the three divide the work.

Every module and library it composes is a `workspace:*` dependency in its `package.json`, named `@scouterna/wsj27-campfire-<name>`, and resolved to raw TypeScript source – nothing is built between a module and the application. Vite's configuration is [`config/vite/vite.config.ts`](../../config/vite/vite.config.ts), kept in `config/` with every other tool's and run with `--config`; it serves `assets/` as the public directory, builds into `apps/web/.build`, and holds the dev server to port 3000 with `strictPort`.

## The composition root

`src/routes.tsx` is the only file that knows every module, which is what lets no module know another ([ADR 016](../../docs/decisions/016-compose-the-web-application-from-feature-modules.md)). Two tables carry that:

- `screens` – the application's own `/`, plus each module's exported route table spread in, every screen wrapped in the section guard
- `widgets` – each module's exported widget table spread into one, and handed to `WidgetsProvider` at the session gate, so a screen places another module's widget by id

Follow the shape when you add to it.

**A new screen** belongs to the module that owns its data. The module augments `RouteRegistry` with its address, branded `Address<"module">`, exports a `Routes` table, and the application spreads it into `screens` – the participants module's `src/routes.tsx` is the pattern's first instance. Two modules claiming one path is a compile error, which is the point. Only `/` is the application's own, because home is the one address that is no single module's. [Navigation and routing](../../docs/guidebook/architecture/layers/navigation.md) has the three fields a route entry carries, why a screen names itself instead, and why the table is keyed by path.

**The sections are the application's model.** They are derived from the session's roles, and one `isGranted` predicate feeds the menus, the chrome, and the screen guard, so an address outside the granted sections answers as not found – indistinguishable from an address that matches nothing, and the hidden screen never mounts. The predicate fails closed: a screen whose `tab` names no section is reachable by nobody.

**A new widget** belongs to the module that owns its data. The module augments `WidgetRegistry` with its id, branded `WidgetFrom<"module">`, exports a `Widgets` table, and the application spreads it into `widgets`. Placing it – where, for whom, and from when – is the receiving screen's own business, in its own module: the home screen gates its widgets behind the units reveal and the leader role itself. Nothing about a screen's content is decided here.

**A cross-module fact is ambient, not threaded.** A fact about the signed-in person that a module needs is on the `User`, which the gate hands to `utils`' `UserProvider` once, and the module reads it with `useUser` where it uses it – the way the journey's countdown reads `useUser()?.travel`. A new fact is a new field on `User`, filled in by the authentication module's converter, not a new provider. The application does not compute on a module's behalf: if this file is working something out for a screen, the logic belongs in that screen's module, and if it is deriving something from the signed-in person, it belongs on `User`. What stays here is translation between packages that may not know each other – `themeFor` turns the `User` into `ui`'s theme, `viewerFor` into the participants module's `Viewer`, and the chrome into `ui`'s avatar – because `utils` can import neither, and that joining is exactly what a composition root is for. Signing out is the same kind of joining: `signOutAndForget` forgets the cache `query.ts` keeps and then starts the authentication module's round trip, and the gate hands it to that module's `SignOutProvider`, because the profile page that presses it is a routed screen and takes no props. If a module needs another module's type, the composition is wrong, not the rule.

## The gate and the two chromes

`AppChrome` is the router's `InnerWrap` and the session gate, in `routes.tsx`. It asks `currentUser(queryClient)` once per page load, renders nothing until the answer – no spinner, and no flash of the sign-in screen past a signed-in person – and then mounts the sign-in screen in the remembered theme or the signed-in application: the theme resolved unit-first, the roles made ambient through `RolesProvider`, and one branch on `host.tier` – after `adoptCacheOwner` has handed the cache to the signed-in member number:

- `ShellChrome` draws no chrome at all. Its job is the bridge conversation: reporting the session, the theme name, and the current screen, and subscribing to what the native bars send back ([ADR 018](../../docs/decisions/018-bridge-the-web-application-and-the-shells-with-versioned-messages.md)). The conversation is still ahead of the tree – today it draws the bare content column, so the branch exists as the seam the bridge feature fills.
- `BrowserChrome` draws the side menu, the navigation bar, the content column, the outline, and the tab strip, and the profile control that leads to the profile page – at the side menu's foot on a desktop, compact at the bar's trailing edge on a phone, and marked as the current page, with its press swallowed, on the profile page itself.

The branch is computed before the first render, so chrome belonging to the other tier is never briefly visible. `canGoBack` comes from the route's declared `parent`, never from `history.length` – that lies after a cold deep link. [Presentation layer](../../docs/guidebook/architecture/layers/presentation.md) describes the gate's order and why nothing renders before the answer.

`libraries/host` already answers which tier the application is in. It reads the `CampfireShell` token off the User-Agent once, at module evaluation, and freezes the answer – so there is no message to wait for. It carries no messages yet; the bridge's web half lands beside it.

## Data, the cache, and the network

- Fetch origin-relative paths only. The application never knows which environment it is running in, and there is no environment switch in the front-end ([ADR 012](../../docs/decisions/012-run-campfire-in-three-environments-on-one-origin.md)).
- Query defaults in `src/query.ts` are set for a field in Poland: `staleTime` 24 hours, `gcTime` 30 days, `networkMode: "offlineFirst"`, and no refetch on mount, focus, or reconnect. Do not override them per query without a reason worth writing down.
- Persistence is per query, into IndexedDB, rather than one serialized snapshot of the whole cache. When a cached payload's shape changes, bump the store's buster – a stale shape read as a fresh one is worse than a cold cache.
- `adoptCacheOwner` wipes both the in-memory client and the store when the signed-in member number changes. A leader's cached health answers must never survive to the next sign-in on a shared device.

The client and its defaults are real: `src/query.ts` holds the one `QueryClient`, and **every service read goes through it** – the gate hands it to `currentUser`, and the screens' hooks read it from the provider the gate mounts. The utils `fetch` is the transport inside a query function, never a path around the cache. The per-query persister and `adoptCacheOwner` live beside the client, buster and all. [Data layer](../../docs/guidebook/architecture/layers/data.md) is the whole design, down to the DTO boundary the converters validate at.

## Styles, themes, and the PWA

- The cascade layers are declared in `index.html` before any stylesheet loads – `@layer tokens, fonts, reset, base, component, screen` – so stylesheet order never matters anywhere else. `app.css` is linked from the document rather than imported from TypeScript, so `tsc` never has to resolve CSS.
- `src/app.css` owns where the chrome sits and nothing else: the one import of `@scouterna/wsj27-campfire-ui/styles.css`, the layout's three breakpoints, and the view-transition choreography, keyed off the direction the navigation listener writes onto the document. What a piece looks like belongs to `libraries/ui`.
- No inline `style` props. Font sizes go through the `--font-size-*` tokens, in rem against the 17-point base the design system sets, so Dynamic Type carries the reader's own text size.
- A theme is a name, not a stylesheet – `blue`, `brown`, `green`, `red`, or `yellow`, resolved once above the screens and written to `data-theme`. `applyInitialTheme` stamps the remembered or requested one before React boots, and the gate resolves the signed-in one: the unit's color, the management's red, or the remembered theme. Never send a color over the bridge; the shells hold their own palette per name.
- `vite-plugin-pwa` generates the manifest and an `autoUpdate` service worker that precaches the built shell. Navigations under `/api/`, `/_services/`, and `/services/` stay off the fallback, because the ingress serves something else there – sign-in and sign-out are full-page navigations to the auth service, and the CMS lives under `/_services/cms` – and a precached shell served in their place breaks them.
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
