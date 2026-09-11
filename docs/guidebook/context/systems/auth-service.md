# Auth service

`wsj27-auth-api` is Campfire's own authentication service. It turns a round trip to [ScoutID](./scoutid) into a session on Campfire's origin, and it does nothing else.

It is on the context diagram as a system of its own rather than as a part of Campfire. It lives in its own repository, `Scouterna/wsj27-auth-api`, ships as its own container image, and is released on its own cadence ([ADR 013](/decisions/013-build-the-back-end-as-python-services-in-their-own-repositories)). Nothing in this repository holds a line of its source.

## What it does for Campfire

Everything it owns sits behind `/api/auth` on the same origin as the application, so the front-end asks for `/api/auth/user` with no host, no base URL, and no environment switch ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin), [ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)).

- Runs the OpenID round trip with ScoutID, and mints the session on the way back. The session is httpOnly cookies, so the web application never sees a token ([ADR 019](/decisions/019-authenticate-on-the-app-origin-through-scoutid)).
- Answers who is signed in, re-mints the short-lived access token from the refresh cookie, and ends the session on both sides at sign-out.
- Serves the small refresh script the application injects, which watches a public expiry cookie and keeps the session alive while the app is open.
- Publishes the keys its tokens are signed with at `/api/auth/certs`, which is what lets the [participants service](./participants-service) verify a caller without asking anyone.

[Applications](../../architecture/applications) lists the paths one by one.

## Who talks to it

The [authentication module](../../architecture/modules) is Campfire's whole client half of that contract – one module, calling `/api/auth` through the front door. Nothing else in the application touches it, and the shells do not call it at all: they open the sign-in round trip in a modal webview that shares their cookie jar, and read the result back from the web application over the bridge ([ADR 018](/decisions/018-bridge-the-web-application-and-the-shells-with-versioned-messages)).

Outward it talks to two systems. ScoutID, for the round trip. And the participants service, which owns the role model: the auth service mints a service token of its own, carrying the `wsj27:bulkread` role, and reads the finished member-to-roles map back to mint into a member's session.

## Where it runs

In the dev and prod container environments it is built straight from its repository's `main`, wired up in `config/environments/dev/compose.yaml` and the prod copy beside it – the back-end services are part of this system rather than dependencies held at arm's length, so an environment takes whatever `main` holds. The credentials it needs live in a gitignored `.env` beside that file. Deployed, it is a container on Kubernetes in Azure behind the same ingress as everything else ([ADR 027](/decisions/027-run-the-back-end-on-kubernetes-in-azure)) – which is how the dev origin, `campfire.wsj27.scouterna.net`, runs it.

## What stands in for it locally

In the [local environment](../../development/environments) it is not there at all. The [mock](../../testing/mock) answers every one of its routes instead, as the service's code answers them ([ADR 021](/decisions/021-stand-in-for-the-back-end-with-a-seeded-mock)), so refresh recovery is exercised locally exactly as it is against the real thing. It signs real tokens and publishes their keys at `/api/auth/certs`, which the mock's project API verifies against. Behind it, a stand-in for ScoutID shows a persona picker where ScoutID would ask for a password – tap a name, and the same cookies land.
