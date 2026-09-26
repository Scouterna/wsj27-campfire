# 019. Authenticate on the app origin through ScoutID

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

::: warning A later record moved part of this
[ADR 033](033-recover-an-ended-session-at-the-query-client-and-the-gate.md) amends two things below: the sign-in screen also appears in place when a session ends mid-use, and what is in flight then is canceled by clearing the cache; and after boot, only a refusal reads as signed out – a service that cannot be reached ends nothing. Everything else here stands.
:::

## Context

Everyone Campfire is for is a member of Scouterna, and ScoutID – a Keycloak – is where they already sign in. A second account would be support work during the weeks nobody has time for it.

The session has to live on three surfaces at once – a browser, a WKWebView, and an Android WebView ([ADR 010](010-deliver-the-front-end-as-one-web-application-in-native-shells.md)). A single-page application cannot hold a client secret and should not hold a token it can read, because an injected script could read it too, and cookie policy in an embedded browser is the least predictable part of either platform. [ADR 012](012-run-campfire-in-three-environments-on-one-origin.md) fixes one origin, with `/api/auth` routed by the front door.

## Decision

We put every part of authentication under `/api/auth/*` on the application's own origin, and keep the session in httpOnly cookies the web application never reads.

- **The service behind `/api/auth` is `wsj27-auth-api`** ([ADR 013](013-keep-the-back-end-services-in-their-own-repositories.md)), and the local environment routes it to the mock.
- **The browser does the round trip.** Signing in and signing out are full-page navigations to the auth service, which takes the browser through ScoutID and back.
- **The client half is `modules/authentication`, and it is small.** It asks `/api/auth/user`, tries one refresh on refusal, and reads every failure as signed out.
- **What the provider reports is adapted, not used raw.** An adapter distills Keycloak's roles into an identity – the unit a leader leads, management, and wider health access – because the claim shape has changed before.
- **The shells run the flow in a modal webview sharing the cookie jar**, allowing only the app's `/api/auth` leg and the identity origins. Once the flow lands back on the application, the main webview takes over, signed in.

## Consequences

- No script can read the token, so none can leak it, and a client that is not a browser needs a door of its own.
- Signing in discards the page, which works because the session gate runs before any screen mounts.
- The session is bound to one host name, so a shell pointed elsewhere cannot sign in.
- Signing out has to end the ScoutID session too, or the shared jar silently reuses it.
- The query cache is owned by a member number and wiped when it changes ([ADR 017](017-route-and-load-data-with-tanstack-router-and-query.md)).

## Alternatives considered

- A token in `localStorage` – readable by any injected script, and refreshed by the application.
- Authentication on its own origin – every cookie becomes cross-site, the worst fight to have in a webview.
- Native sign-in with `ASWebAuthenticationSession` and Custom Tabs – the cookies land in the system jar, and the shell would have to pass a token across the bridge.
- The round trip in the main webview – a failed flow strands the user without chrome, and the sign-in pages stay in the back stack.
