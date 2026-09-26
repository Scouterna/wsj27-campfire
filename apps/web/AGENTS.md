# Web application

Read the [root `AGENTS.md`](../../AGENTS.md) first. This file is what is true only of `apps/web`, the React application the shells host ([ADR 010](../../docs/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells.md)). Why it is shaped this way is the guidebook's [Applications](../../docs/guidebook/architecture/applications.md) page.

`apps/web` is the composition root – the only package that knows every module. It mounts what the modules export and translates between packages that may not know each other. It never implements a screen, a widget, or the state behind them; those belong to a module ([`modules/AGENTS.md`](../../modules/AGENTS.md)).

## Layout

```text
apps/web/
├── index.html    the cascade layer order, the icons, the stylesheet link, and the module script
├── assets/       served verbatim – the favicon, the app icons, the PWA's images
│   └── units/    the units' manifest and one glyph per unit
└── src/
    ├── main.tsx        the boot order before React: the theme stamp, the navigation wiring, the bfcache reload, the mount
    ├── routes.tsx      the route and widget tables, the sections, the gate, and the two chromes
    ├── navigation.ts   the navigation memory: direction, trails, and scroll restoration
    ├── outline.tsx     the desktop outline column, read from the page as rendered
    ├── query.ts        the one query client, its persister, the session wrapper, and the cache-owner handover
    ├── service-worker.ts   when a new deploy reaches an open page
    ├── units.ts        the units' identities, loaded from assets/units/
    └── app.css         the chrome layout, the view transitions, and the one import of the design system's stylesheet
```

Every module and library is a `workspace:*` dependency, resolved to raw TypeScript. Vite's configuration is [`config/vite/vite.config.ts`](../../config/vite/vite.config.ts): it serves `assets/` as the public directory, builds into `apps/web/.build`, and holds the dev server to port 3000 with `strictPort`.

## The composition root

`src/routes.tsx` holds two tables. `screens` is the application's own `/` plus every module's route table, each screen wrapped in the section guard. `widgets` is every module's widget table, handed to `WidgetsProvider` at the gate.

- **A new screen or widget belongs to the module that owns its data.** The module registers it and exports its table, and the application spreads the table in – nothing more. Only `/` is the application's own, because home is no single module's address. [Navigation and routing](../../docs/guidebook/architecture/layers/navigation.md) has what a route entry carries.
- **Sections are derived from the session's roles**, and one `isGranted` predicate feeds the menus, the chrome, and the guard. An address outside the granted sections answers as not found, and the predicate fails closed – a screen whose `tab` names no section is reachable by nobody.
- **A cross-module fact is ambient, not threaded.** A fact about the signed-in person is a field on `User`, filled in by the authentication module's converter and read with `utils`' `useUser`. If this file is working something out for a screen, the logic belongs in that screen's module.
- **What stays here is translation.** `themeFor`, `viewerFor`, and the chrome's avatar turn the `User` into what `ui` and the participants module expect, because `utils` can import neither. `signOutAndForget` forgets the cache and then starts the authentication module's sign-out, handed to its `SignOutProvider`.

## The gate and the two chromes

`AppChrome` in `routes.tsx` is the router's `InnerWrap` and the session gate, one `Gate` state: `asking`, `signed-in`, `signed-out`, or `ending` ([Presentation layer](../../docs/guidebook/architecture/layers/presentation.md)).

- It asks `currentUser(queryClient)` once at boot and renders nothing until the answer – no spinner, and no flash of the sign-in screen.
- Signed in, it hands the cache to the member number with `adoptCacheOwner`, loads the units' identities, resolves the theme unit-first, makes the roles ambient, and branches once on `host.tier`.
- The units' names and glyphs are runtime data from `assets/units/`, not code. A manifest that is missing or unreadable costs the names and nothing else – every consumer falls back to the unit's number.
- It listens through `subscribeToSession`. A session the service ends goes to `ending` while `forgetCache` empties the client and the store, then to `signed-out` at the same address; a session that changes hands reloads the page ([ADR 033](../../docs/decisions/033-recover-an-ended-session-at-the-query-client-and-the-gate.md)).
- `ShellChrome` draws no chrome, because the shell draws it. It is the seam the bridge conversation fills ([ADR 018](../../docs/decisions/018-bridge-the-web-application-and-the-shells-with-versioned-messages.md)).
- `BrowserChrome` draws the side menu, the navigation bar, the content column, the outline, the tab strip, and the profile control.
- The branch is computed before the first render, so the other tier's chrome is never visible. `canGoBack` comes from the route's declared `parent`, never `history.length`, which lies after a cold deep link.

## Data and the cache

- **Every service read goes through the one `QueryClient`** in `src/query.ts`. The utils `fetch` is the transport inside a query function, never a path around the cache ([Data layer](../../docs/guidebook/architecture/layers/data.md)).
- **Fetch origin-relative paths only.** The application never knows its environment ([ADR 012](../../docs/decisions/012-run-campfire-in-three-environments-on-one-origin.md)).
- **The query defaults are set for a field in Poland** – a long garbage-collection time, offline first, a refetch on every mount, and none on focus or reconnect. A hook that reads a query hands its screen the cached data rather than an error when a fresh read fails. Override a default per query only with a reason worth writing down.
- **Persistence is per query, into IndexedDB.** When a cached payload's shape changes, bump the store's buster, because a stale shape read as fresh is worse than a cold cache.
- **`withSession` runs every network read.** A 401 asks who is signed in, and the same person still signed in gets the read once more, so no screen renders a refusal.
- **`adoptCacheOwner` wipes the client and the store when the member number changes**, so one leader's cached health answers never reach the next sign-in on a shared device.

## Styles, themes, and the PWA

- The cascade layers are declared in `index.html` before any stylesheet loads, so stylesheet order never matters. `app.css` is linked from the document, not imported, so `tsc` never resolves CSS.
- `app.css` owns where the chrome sits – its breakpoints and the view-transition choreography – and nothing about how a piece looks, which is `libraries/ui`'s.
- A theme is a name written to `data-theme`, never a stylesheet and never a color sent over the bridge.
- `vite-plugin-pwa` precaches the built shell, and `service-worker.ts` reloads an open page onto a new deploy as soon as it takes control, checking for one whenever the application returns to the foreground. Navigations under `/api/`, `/_services/`, and `/services/` stay off its fallback, because sign-in, sign-out, and the CMS are served there, and a precached shell in their place breaks them.
- The document is Swedish, and so is every word a user reads.

## Tests and running

- A screen is proven by its module's Playwright walk-through and by Storybook, not by unit tests ([ADR 024](../../docs/decisions/024-walk-through-the-web-application-per-module-with-playwright.md), [ADR 023](../../docs/decisions/023-catalog-the-ui-in-storybook.md)). A change to a screen ends with `pnpm test:web:ui`.
- `apps/web` has no Vitest project. The first test here needs one in [`config/vitest/vitest.config.ts`](../../config/vitest/vitest.config.ts), whose list is hand-written so a glob never decides what runs.
- `build_web.yml` builds the application and Storybook on a pull request, so a story that no longer bundles fails there. Run `pnpm build:web` and `pnpm build:storybook` for a change they import.
- `pnpm start:web` serves the application alone, with nothing behind the back-end paths. `pnpm start:local` puts the mock behind them.
- Read the [architecture chapter](../../docs/guidebook/architecture/index.md) before a change that moves a boundary.
