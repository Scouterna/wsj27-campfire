# 019. Authenticate on the app origin through ScoutID

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Everyone Campfire is for is already a member of Scouterna, and Scouterna already knows who they are. ScoutID – a Keycloak – is where that identity lives and where a leader signs in to everything else the movement runs. A second account, with a second password and a second reset queue, would be work for them and support for us, arriving during the three weeks when nobody has time for it.

So the question is where the session lives, on three surfaces at once: a browser, a WKWebView, and an Android WebView, all loading the same application ([ADR 010](010-deliver-the-front-end-as-one-web-application-in-native-shells.md)). A single-page application cannot hold a client secret and should not hold a token it can read – anything the page can read, an injected script can read too. Webviews make it worse: cookie policy in an embedded browser is the least predictable part of either platform. [ADR 012](012-run-campfire-in-three-environments-on-one-origin.md) fixes the shape: one origin, `/api/auth` routed by the front door, and a round trip that completes only on the host name the identity provider sends the browser back to.

## Decision

We put every part of authentication under `/api/auth/*` on the application's own origin, and keep the session in httpOnly cookies the web application never reads.

- **The service behind `/api/auth` is `wsj27-auth-api`**, in its own repository ([ADR 013](013-build-the-back-end-as-python-services-in-their-own-repositories.md)). Each environment's front door routes the prefix to it, and the local environment routes it to the mock.
- **The browser does the round trip, not the application.** Signing in is a full-page navigation to `/api/auth/login`, which redirects to ScoutID and back through `/api/auth/callback` – the one place cookies are minted. Signing out is a navigation too, and ends the ScoutID session as well.
- **Two cookies, one readable.** The access token is httpOnly and the expiry is not, so a script the service serves can watch the clock and keep an open app signed in.
- **The client half is `modules/authentication`, and it is small on purpose.** It asks `/api/auth/user`, tries one refresh on refusal, and reads every failure – a network error, a 401, a body that is not JSON – as signed out, because the screen behind it shows sign-in either way.
- **What the provider reports is adapted, not used raw.** Roles arrive in Keycloak's claim shape and an adapter distills them into an identity – which unit a leader leads, whether they are management, who may read health answers beyond their own unit. The seam stays because what the provider reports has changed shape once and will again.
- **The shells walk the flow in their own webview, modally, sharing the cookie jar.** That webview allows the app origin's `/api/auth` leg and the configured identity origins and nothing else; a link out of the flow opens in the system browser. The moment the flow lands back on the application, the sheet is done and the main webview takes over, already signed in.

## Consequences

- No script in the page can read the token, so no script can leak one. The price is that a cookie is the only door, and a client that is not a browser needs one designed for it.
- Signing in throws away whatever the page held, because it is a navigation rather than a fetch. That works only because the session gate runs before any screen mounts, so nothing is ever in flight to lose.
- The session is bound to one host name, so a developer cannot point a shell at another address and still sign in.
- The cookie jar is shared across the shell, so signing out has to reach ScoutID too; otherwise the next sign-in silently reuses the provider's session.
- Authentication decides what the query cache may keep: the cache is owned by a member number and wiped when the owner changes ([ADR 017](017-route-and-load-data-with-tanstack-router-and-query.md)).

## Alternatives considered

- **A token in JavaScript, in `localStorage`.** The conventional single-page shape. It puts a bearer token where any injected script can read it, makes the application responsible for refresh, and in a webview invites the token into storage whose eviction rules are the platform's.
- **Authentication on its own origin**, `auth.wsj27.se` or similar. Every session cookie becomes a cross-site cookie, and a webview is the worst place to argue with `SameSite=None`, ITP, and Android's tracking rules. ADR 012 exists to keep one origin.
- **Our own accounts.** Passwords, resets, and an account for every leader who already has one – support work during camp, for a problem the movement already solved.
- **Sign in natively, with `ASWebAuthenticationSession` and Custom Tabs.** The flow would look like every other app's, and the cookies land in Safari's jar rather than the webview's, so the web application would still be signed out and the shell would have to hand a token across the bridge – a session in the one place ADR 010 keeps empty.
- **The round trip in the main webview.** No second webview, no sheet, no origin list. A flow that goes wrong strands the user on the provider's page with no chrome to escape it, and the finished sign-in pages stay in the back stack for the next back press to find.
