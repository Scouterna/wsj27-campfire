# 017. Route and load data with TanStack Router and Query

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Every route resolves in the browser ([ADR 014](014-build-the-web-application-on-react-with-vite.md)), and each module declares its own addresses without importing another ([ADR 016](016-compose-the-web-application-from-feature-modules.md)), so many modules add to one URL space.

The data is read where the connection is worst – a field shared with thousands of other phones – so what was fetched has to survive a cold start offline. The back-end scopes each answer to who asked, so a phone two leaders sign into must never show the first one's data to the second.

## Decision

We route with TanStack Router and load data with TanStack Query.

- **The URL space is one typed registry.** Each module adds its addresses to `RouteRegistry`, and two modules claiming one path is a compile error.
- **Data is offline-first.** A screen draws what the cache holds at once and asks for a fresh answer when it mounts. A fresh answer that fails leaves the cached one in place, and focus and reconnect ask for nothing.
- **The cache is persisted per query into IndexedDB**, so it survives a restart without rewriting the whole cache on every change.
- **The cache belongs to the signed-in person.** A different member number signing in wipes it, in memory and on disk.

## Consequences

- A screen opens instantly from what the phone already has, with or without a connection.
- A correction reaches a phone the next time a screen showing it opens with a connection.
- Personal data stays on the device until the cache drops it or someone else signs in. Storage in a webview is best-effort, so every screen still works with an empty cache.
- Router and Query come from one vendor and move together.

## Alternatives considered

- React Router – typed routes need its file convention and generated code, which does not fit modules adding to one namespace.
- Caching `/api/*` in the service worker – an HTTP cache cannot tell whose answer it holds, so a shared phone would show one leader's data to the next.
