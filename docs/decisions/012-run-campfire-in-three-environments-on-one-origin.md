# 012. Run Campfire in three environments on one origin

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Campfire is one web application with two native shells in front of it ([ADR 010](010-deliver-the-front-end-as-one-web-application-in-native-shells.md)) and a back-end it does not own. A developer needs the whole arrangement running before they can see anything, and the origin is not a detail they can vary: a shell loads the application from an origin baked into its build, and the sign-in flow completes only on the one host name the identity provider sends the browser back to.

The web application embeds nothing per environment: no origin, no build-time variable. There is exactly one artifact, served from wherever it is served from, and the only thing that differs between environments is what answers the back-end paths. Those paths need a rule of their own, because `/api` alone names a category rather than a service – whichever service is first behind it takes the whole namespace, and the next has nowhere natural to go.

## Decision

We name one axis – the environment, which is what sits behind the back-end paths – and every environment serves the same origin, `http://localhost:8000`:

- **local** – the mock back-end. Sign-in is a persona picker, and nothing reaches the network.
- **dev** – the real back-end in containers, so the real sign-in flow can be exercised.
- **prod** – the same back-end, with the deployable image serving the web instead of a dev server, so what runs is the artifact.

From that:

- **`start:<environment>` brings up a whole environment; `start:<server>` runs one server.** The shells always point at `http://localhost:8000`, so `start:android` and `start:apple` take no environment. A shipped artifact does bake a remote origin, so `build:android:dev`, `build:apple:prod`, and their siblings exist; `build:image` has no environment, because the web application has none.
- **Everything about running Campfire lives in `config/environments/`, one folder per environment**, each holding its own front door and whatever else it needs. The environments duplicate rather than share: a folder that reads top to bottom is worth more than the lines a shared profile would save.
- **Every back-end service has its own prefix under `/api/`, named for the service.** `/api/auth` is `wsj27-auth-api`, `/api/project` is `wsj27-project-api`, and a service added later takes `/api/<service>`. The prefix is stripped before a request reaches the service, so a service serves its endpoints at its own root and the mock and the deployed ingress mount the same contract at the same address. Everything outside `/api/` is the web application's, including the root.

## Consequences

- `local`, `dev`, and `prod` mean an environment everywhere they appear, and a command says what it does.
- `dev` and `prod` need real credentials – a Keycloak client and the Scoutnet project keys, in a gitignored `.env` – and refuse to start without them, because a back-end that half-works is harder to reason about than one that says what is missing.
- No prod back-end exists yet, so `start:prod` exercises the artifact against a dev back-end. It needs an image and will not build one, because a stale image that looks like it worked is worse than a missing one.
- The shells gate their sign-in webview on the auth prefix, and a stale prefix does not fail loudly – it hands control back before the callback mints the cookies, so sign-in appears to do nothing.
- Four Caddy configurations and two compose files have to be kept in step, and a new back-end path is added to each front door that routes it – the same work the deployed ingress needs.

## Alternatives considered

- **Two axes** – environments for the shells, modes for the stack – or an environment argument on `start:android` and `start:apple`. Two vocabularies for one origin, and three shell commands that would run the identical thing.
- **A prefix per service at the root**, `/auth` and `/project`. It spends the root on service names, so every future screen path is checked against the service list first.
- **A host per service.** It makes the session cookies cross-origin, which is the case webviews handle worst, and gives the front-end a base URL to configure per environment.
- **Let `dev` and `prod` fall back to the mock, or leave `/api/*` out of their front doors.** The first hides which half of the back-end is real; the second lets an unmatched path fall through to `index.html` with a 200, so a missing back-end looks like a working one.
- **Serve prod from the built files without a container.** It tests the bundle and not the image, the server inside it, or the fallback rule that makes deep links work.
