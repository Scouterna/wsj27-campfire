# 026. Publish the web application as a container image

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

::: warning A later record moved part of this
[ADR 034](034-version-each-artifact-from-its-own-commits.md) replaces the version in `package.json` as the release trigger with a version worked out from the commits, and [ADR 035](035-promote-the-web-by-moving-environment-tags.md) drops `:latest` and moves `:dev` and `:prod` instead. The registry, the image's shape, the platform, `:main` and `:sha-<short>`, and publish-then-tag all stand.
:::

## Context

The web application is the whole front-end ([ADR 010](010-deliver-the-front-end-as-one-web-application-in-native-shells.md)), and something has to serve it. The artifact has to be neutral about where it lands, so choosing a host is pointing it at an artifact rather than building the pipeline that produces one.

Its shape is settled by how the project runs locally: every environment puts Caddy in front of the application on one origin, because the back-end paths belong to an ingress ([ADR 012](012-run-campfire-in-three-environments-on-one-origin.md)). What is missing is somewhere to put the image and a rule for what a version means – and the repository already has one, a declared version as the release trigger ([ADR 025](025-publish-agent-skills-as-versioned-releases.md)), with `package.json` carrying a CalVer version ([ADR 007](007-version-with-calver-on-a-rebased-history.md)).

## Decision

We publish the web application as a container image to the GitHub Container Registry, versioned from `package.json`.

- **The image is Caddy serving the bundle**, built by the workspace's own Dockerfile, and nothing else.
- **It is published to `ghcr.io` under the repository's owner**, authenticated by the workflow's own token.
- **The version in `package.json` is the release trigger.** A merge to `main` whose version has no `web-v<version>` tag publishes `:<version>` and `:latest`, and the tag is created after the push, so it never names an image that is not there.
- **Every merge also publishes `:main` and `:sha-<short>`**, for rollback and for pinning one exact commit. A real deployment pins `:<version>`.
- **The image is built for `linux/amd64` only**, because the artifact targets the server, not the Apple silicon it is built on. The build stage runs on the builder's own platform, since its output has no architecture, so nothing expensive runs under emulation.
- **The workflow publishes and stops**, holding no host, credentials, or environment.

## Consequences

- Any runtime that can pull an OCI image can run this, and choosing one does not reach back into the build.
- One release model for the skills and the application: a version is a deliberate edit, and its tag is its identity.
- A forgotten bump publishes `:main` and `:sha-<short>` and silently cuts no version.
- An arm64 host cannot run the image, and `pnpm start:prod` on Apple silicon runs it under emulation. A second platform is a one-line change once a host needs it.
- The image is public, so what goes into it is a distribution decision. It carries no signature, attestation, or SBOM.

## Alternatives considered

- Deploying straight from continuous integration – it couples the build to a host.
- Docker Hub – a second account, stored credentials, and pull rate limits.
- Building at deploy time – what runs would not be what was tested.
