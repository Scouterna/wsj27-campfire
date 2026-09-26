# 033. Recover an ended session at the query client and the gate

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-23" /></p>
:::

## Context

[ADR 019](019-authenticate-on-the-app-origin-through-scoutid.md) kept the session in httpOnly cookies and had the gate ask who is signed in once per page load. The auth service's script keeps the session alive while the page is open, and stops silently when a refresh is refused. Every read after that answers 401, and each screen words it as a data failure – "Personen kunde inte visas." for a person who is there.

Every read goes through one query client ([ADR 017](017-route-and-load-data-with-tanstack-router-and-query.md)), and each screen renders `error` off its query, so a 401 that reaches a screen is already wrong. The composition root computes nothing ([ADR 032](032-hold-the-signed-in-person-in-utils.md)). And a session can end under an idle screen, so a refused read cannot be the only trigger.

## Decision

We recover an ended session at the query client and the gate, and watch the expiry beside the service's own script.

- **The seam is the query client's per-query wrapper.** Every read runs under the authentication module's `withSession`: a 401 asks who is signed in, and the same person runs the read once more, while any other answer rethrows. The query stays pending, so no screen sees the 401, and a module declares nothing to be covered.
- **The session is a store the authentication module owns.** One identity ask is in flight at a time, and subscribers hear only when the answer changes – nobody, or another member number.
- **Only the service saying no ends a session** – a refused refresh, or `/api/auth/user` refusing after a successful one. An ask that cannot reach the service changes nothing, because a session ended by a lost signal would forget the cache when it matters most.
- **The gate listens after boot.** An ended session forgets the cache, in memory and in the store, and shows the sign-in screen in place at the same address. A changed owner reloads the page, since the boot gate already adopts a new owner before any screen mounts.
- **The application watches the expiry cookie**, shortly after the expiry it names and whenever the page becomes visible, and asks through the same store when it is past or absent.

This amends ADR 019: what is in flight when a session ends is canceled by clearing the cache, and after boot only a refusal reads as signed out.

## Consequences

- An ended session reads as one on every screen, and a stale access token costs a read one round trip.
- The query client's setup now knows the authentication module, and still decides nothing.
- An offline device past its expiry keeps its screen.

## Alternatives considered

- `QueryCache.onError` – the query has already settled to `error`, so every screen flashes its failure.
- The seam in `utils`' `fetch` – a library that may not know the session would need a registered handler.
- A `retry` function that pauses on 401 – the client's retry cannot wait on a promise.
- Adopting a changed owner in place – a remount of every provider to do what a page load does.
