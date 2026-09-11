# 017. Route and load data with TanStack Router and Query

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

The web application is one bundle with no server behind it ([ADR 014](014-build-the-web-application-on-react-with-vite.md)), so every address is resolved in the browser and every piece of data arrives over an origin-relative path ([ADR 012](012-run-campfire-in-three-environments-on-one-origin.md)). Two questions follow: how a URL becomes a screen, and how a screen gets its data.

Campfire's worst day is a Tuesday in a field on Wyspa Sobieszewska, with two and a half thousand scouts sharing whatever cell towers reach the island – exactly when a leader needs the register, and exactly when a request is least likely to answer. What was fetched has to survive a cold start with no connection. And data arrives per person: the back-end scopes what it returns to who asked, so a device two leaders sign into over a camp must not serve the first one's cached unit, health answers included, to the second.

Routing has constraints of its own. Modules declare their own addresses and never import each other ([ADR 016](016-compose-the-web-application-from-feature-modules.md)), so the URL space is one namespace many modules contribute to and the compiler still checks. And the shells draw their navigation bar from what the web reports, so the router has to answer "what is this screen called, and does back apply?" from the route itself – `history.length` lies inside a webview.

## Decision

We route with TanStack Router and load data with TanStack Query, both configured for a field rather than a desk.

- **The URL space is one typed registry.** Each module hands the application a table of addresses to screens and augments the `RouteRegistry` interface from its own source, with every entry branded by its owning module, so two modules claiming one path is a compile error rather than a race the later import wins.
- **A screen declares its title and its parent, and `canGoBack` derives from the parent** – never from history depth. A shell's back button means "up one screen" however the user arrived. Every navigation is a View Transition.
- **The query defaults are ours, not the library's.** Data is stale after a day and kept for thirty, the network mode is offline-first, and nothing refetches on mount, focus, or reconnect. Refetching is something the application asks for, not something a phone waking up in a field does on its own.
- **The cache is persisted per query into IndexedDB**, never as a whole. Re-serializing the entire cache on every change freezes the UI once the register is large.
- **The cache has an owner.** The session gate adopts the signed-in member number before any screen mounts, and a different owner than the stored one wipes both the in-memory cache and the store. The same person signing back in keeps everything; only a change of person costs a refetch.
- **A list that can grow to the contingent's size is virtualized**, with TanStack Virtual from the same vendor. The register is 2,600 people read as one list, and mounting 2,000 rows when a filter widens costs 300 ms on a desktop and several times that on a phone. Rows are measured rather than assumed, because type sizes follow Dynamic Type.

## Consequences

- Stale is the normal case. A correction to the register can take a day to reach a phone unless something asks for it, and no screen offers a refresh control yet; the first screen where day-old data would mislead somebody is the one that closes that gap.
- Personal data sits on the device for up to thirty days, health answers included, and the owner wipe is the only thing between one leader's unit and the next person to sign in on a shared phone. Storage is best-effort besides – a webview is rarely granted persistent storage – so every screen still has to work with an empty cache.
- The per-query persister is an `experimental_` export. Its name will change, and the fix is ours to make on the library's schedule, in one file.
- Find-in-page no longer finds a name that has scrolled out of the DOM. The register's own search is the promise to keep.
- Three fast-moving dependencies from one vendor, pinned and aged under [ADR 005](005-pin-every-dependency-and-let-new-releases-age.md). If TanStack's direction stops matching Campfire's, all three move at once.

## Alternatives considered

- **React Router.** The default answer. Its type safety wants a route-file convention and a code-generation step, and Campfire needs many modules to contribute addresses to one checked namespace with no generated file to keep in sync.
- **Route loaders alone, or plain `fetch` in a `useEffect`.** Neither owns anything between screens, so going back refetches, an offline device gets an error instead of the data it already had, and the persistence story is ours to write.
- **SWR, or RTK Query.** SWR has no per-query persister, so the offline half would be hand-built on top. RTK Query arrives holding Redux Toolkit – a global store and its conventions, for a fetch cache.
- **Let the service worker cache `/api/*` responses.** An HTTP cache has no idea who a response belongs to, so a shared device serves one leader's unit to the next, and the UI cannot tell a fresh answer from a four-day-old one. Caching in the query layer keeps the owner and the age where the screens can see them.
- **Paginate the register, cap it, or lazy-load it on scroll.** All three are a page boundary in different clothes, and the whole list is what the management reads. `content-visibility: auto` was measured as the no-dependency alternative and made Safari slower.
