# 033. Recover an ended session at the query client and the gate

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-23" /></p>
:::

## Context

[ADR 019](019-authenticate-on-the-app-origin-through-scoutid.md) put the session in httpOnly cookies, gave the client one question – `/api/auth/user`, one refresh on refusal, `/api/auth/user` again – and had the gate ask it once per page load. The auth service's own script keeps the session alive while the page is open, and stops silently when a refresh is refused. Nothing tells the application. Every read after that answers 401, and the screens word it as the data failure it is not: "Personen kunde inte visas." for a person who is there, and a list that keeps rendering from the cache until a read leaves the device.

Three things shape the answer. Every read goes through the one query client ([ADR 017](017-route-and-load-data-with-tanstack-router-and-query.md)), and each screen renders `error` straight off its query, so a 401 that reaches a screen is already wrong. The composition root joins and works nothing out ([ADR 032](032-hold-the-signed-in-person-in-utils.md)), so whoever decides what a refusal means is not `apps/web`. And a session can end under an idle screen as easily as under a busy one, so a refused read cannot be the only trigger.

## Decision

We recover an ended session in two places that already exist, and add a third watcher beside the service's own.

- **The seam is the query client's per-query wrapper.** `apps/web/src/query.ts` already wraps every query function for its IndexedDB persister; the same slot now runs each read under the authentication module's `withSession`. A read refused with 401 asks who is signed in and waits; the same person still signed in runs the read once more, and any other answer rethrows. The query stays pending throughout, so no screen ever sees the 401. A module declares nothing for this – a read it adds later is under the seam the moment it is a query. A restore from the store never calls the query function and so never asks.
- **The session is a store the authentication module owns.** One identity ask is in flight at a time – a refused read, the expiry watch, and the gate at boot all join it – and the module records the answer and tells subscribers only when it differs from the last: nobody, or another member number. The decisions stay in the module; `query.ts` and the gate call it.
- **Only the service saying no ends a session.** A session ends when the refresh is refused, or when `/api/auth/user` still refuses after a refresh that succeeded. An ask that cannot reach the service, or gets an answer that is not JSON, changes nothing: the refused read fails as a network failure would, and the screen keeps what it shows. At camp an access token lapses every five minutes while the keep-alive cannot reach the service, and a session ended by a lost signal would forget the cache exactly when it matters most.
- **The gate listens after boot.** An ended session unmounts the application, forgets the cache – in memory and in the store, as sign-out does – and mounts the sign-in screen in place, at the address the person was at, so signing in returns them there. Nothing is read again until then. A changed owner reloads the page: the boot gate adopts a new owner before any screen mounts, and re-running it is cheaper than remounting every provider in place – the same reasoning the back-forward cache already follows.
- **The application watches the expiry cookie.** While somebody is signed in, the module checks the public `wsj27-auth_expires-at` shortly after the expiry it names, and at once when the page becomes visible; a cookie that is past or absent asks through the same store. The service's script keeps the session alive ahead of expiry; the watcher notices when that failed.

This amends ADR 019 twice. The sign-in screen no longer appears only where nothing is in flight: what is in flight when a session ends is cancelled by clearing the cache, before the screen is shown. And after boot, a failure is no longer read as signed out – only a refusal is. At boot it still is, because the sign-in screen there forgets nothing.

## Consequences

- A session that ends reads as a session that ended, on every screen alike, and a stale access token costs a read one round trip and nobody a sign-in.
- `query.ts` now knows the authentication module, as `routes.tsx` already does. The wrapper it composes is mechanical – run the read under `withSession` – and the composition root still decides nothing.
- The authentication module's surface grows by three doorways: `subscribeToSession`, `watchExpiry`, and `withSession`.
- The client's `retry: 1` stays, and a read refused twice costs two asks – the bound is the retry count, not a new rule.
- Two watchers read one cookie. The service's script and the application's watcher may both refresh near an expiry; the service re-mints either way. Should the cookie ever become httpOnly, the watcher reads "absent" and asks once per grace period – degraded, not broken.
- An offline device past its expiry asks once per grace period and gets no answer. One failed request each time, and the screen stays as it was.
- The 60-second bound holds while the page is visible. A hidden tab's timers are throttled by the browser, and the visibility check is what covers the return.

## Alternatives considered

- **`QueryCache.onError`.** Fires once the query has settled to `error`, so every screen flashes its failure wording during the ask.
- **The seam inside `utils`' `fetch`.** A library that may not know the session would need a registered handler, and the module's own `/api/auth` calls would need a way past it.
- **A `retry` function that pauses on 401.** The client's retry cannot wait on a promise; pausing through `onlineManager` would tell every query the device is offline.
- **Completing a changed owner in place.** Needs the registration read and a remount of every provider under the gate, to do what a page load does already.
- **Leaving it to the service's script.** It cannot reach the application, and a script the auth service ships is not this repository's to change.
