# 012. Run Campfire in three environments on one origin

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Campfire is one web application with two native shells in front of it ([ADR 010](010-deliver-the-front-end-as-one-web-application-in-native-shells.md)) and a back-end it does not own. A shell loads the application from an origin baked into its build, and sign-in completes only on the host name the identity provider returns to, so the origin cannot vary. The web application embeds nothing per environment; the only thing that differs is what answers the back-end paths. And `/api` alone names a category, not a service, so the paths need a rule of their own.

## Decision

We name one axis – the environment, meaning what sits behind the back-end paths – and every environment serves the same origin, `http://localhost:8000`:

- **local** – the mock back-end, with a persona picker for sign-in and nothing on the network.
- **dev** – the real back-end in containers, so the real sign-in flow runs.
- **prod** – the same back-end, with the deployable image serving the web, so what runs is the artifact.

From that:

- **`start:<environment>` brings up a whole environment; `start:<server>` runs one server.** The shells always point at `http://localhost:8000` and take no environment. A shipped shell does bake a remote origin, so `build:android:dev`, `build:apple:prod`, and their siblings exist.
- **Everything about running Campfire lives in `config/environments/`, one folder per environment.** The folders duplicate rather than share, because a folder that reads top to bottom is worth more than the lines a shared profile would save.
- **Every back-end has its own prefix under `/api/`, named for it** – `/api/auth`, `/api/project`, and `/api/<name>` for any later one – stripped before the request reaches it. A back-end's services are paths below its prefix, such as `/api/project/participants` and `/api/project/cases`.
- **`/services/` and `/_services/` are reserved for services that share the origin without being Campfire's back-end**, such as the CMS at `/_services/cms`. Everything outside them and `/api/` is the web application's.

## Consequences

- `local`, `dev`, and `prod` mean an environment everywhere they appear.
- `dev` and `prod` need real credentials in a gitignored `.env`, and refuse to start without them rather than half-work.
- A shell whose allowed sign-in paths are out of date fails quietly – sign-in appears to do nothing.
- The front doors and compose files are kept in step by hand, and a new back-end path is added to each.

## Alternatives considered

- Back-end paths at the root, such as `/auth` and `/project` – every new screen's path would have to avoid the back-ends' names.
- A host name per back-end, such as `auth.campfire.example` – the session cookies would cross origins, which webviews handle worst.
