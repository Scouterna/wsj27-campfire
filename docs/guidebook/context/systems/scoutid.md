# ScoutID

ScoutID is Scouterna's sign-in service – the account a Swedish scout already has, and the one they use for Campfire. It is a Keycloak deployment: every address carries a realm, and the roles arrive in Keycloak's conventional shape, realm roles bare and client roles namespaced.

ScoutID owns identity. Campfire owns none of it, and never sees a password or a token: the session is httpOnly cookies minted on Campfire's own origin, and the application asks who the user is rather than reading a claim ([ADR 019](/decisions/019-authenticate-on-the-app-origin-through-scoutid)).

## What it does for Campfire

- Answers the sign-in round trip. A full-page navigation to `/api/auth/login` leaves the app, passes through ScoutID, and comes back to `/api/auth/callback` on the same origin, where the cookies are set.
- Carries the roles – but does not decide them. ScoutID knows nothing project-specific: the [participants service](./participants-service) derives the roles from Scoutnet, and the [auth service](./auth-service) mints them into the token on top of ScoutID's identity. They arrive flattened as colon-separated hierarchies – `wsj27:al:3` for a leader of unit 3, `wsj27:cmt:support:halsa` for the Support function's health people.
- Ends the session on both sides. `/api/auth/logout` drops Campfire's cookies and signs the person out of ScoutID too.

Refresh runs quietly on top of that: the access token is short-lived, a public expiry cookie says when it runs out, and a small script the auth service serves refreshes while the app is open.

## Who talks to it

Three lines reach ScoutID on the context diagram, and the third is the one people miss.

Campfire sends members to sign in at it, and the auth service runs the OpenID round trip with it – the two halves of one journey. The app starts the trip, the service finishes it. A level down, the first of those lines belongs to the two shells, each opening the round trip in a webview of its own, and never to the web application, which navigates to `/api/auth/login` and lets the service do the talking.

The third line leaves ScoutID for [Scoutnet](./scoutnet): **ScoutID verifies sign-ins against Scoutnet**, which is the member registry behind it. ScoutID is the front door, not the source of truth about who a member is. The registry's member number is what comes back through it, too – a session's preferred username is `scoutnet|<member number>`, which is the same key the list of participants is addressed by. So Scoutnet sits behind Campfire twice: through ScoutID for who you are, and through the participants service for who is in the contingent.

## The realms

Two dev ScoutID generations exist, and both are what a shell's sign-in webview is allowed to visit ([ADR 019](/decisions/019-authenticate-on-the-app-origin-through-scoutid)):

- The newer generation at `https://id.wsjdev.se`.
- The older one at `https://dev.id.scouterna.se`, whose `scoutnet` realm is the example `scripts/start/dev.sh` prints when the credentials are missing.

Which one a stack points at is the gitignored `.env` beside each container environment – `OIDC_SERVER`, a client id, and its secret, written once by whoever runs the stack and overwritten by nothing.

The callback moved with the rest of the auth service, to `http://localhost:8000/api/auth/callback` ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)). Whichever client is used must allow that address, and the same hosts as post-logout redirect URIs – without the latter, sign-out strands the person at ScoutID. A client registered against the old path will refuse the round trip until someone updates it in Keycloak, which is a change in ScoutID rather than in this repository.

## What stands in for it locally

Nothing reaches ScoutID from the [local environment](../../development/environments). The [mock](../../testing/mock) holds a stand-in for it under `/__mock__/scoutid`, shaped like the Keycloak realm: a session of its own, one-minute codes checked against PKCE, and an end-session endpoint. Its sign-in page is a persona picker – tap a name, no password, and the same cookies land, carrying the roles a real session would ([ADR 021](/decisions/021-stand-in-for-the-back-end-with-a-seeded-mock)). It groups its twelve personas the way the contingent is organized: the two seeded units' leaders, then the contingent management, then someone from outside it.

## In the shells

Each shell build carries the identity origins it is allowed to visit. The sign-in round trip opens in its own webview, presented modally, sharing the shell's cookie jar so the cookies land where the main webview reads them – and without the `CampfireShell` User-Agent token, because the identity provider is an ordinary web site, not a hosted app. [Applications](../../architecture/applications) has the whole shell pattern.
