# 026. Publish the web application as a container image

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

::: warning A later record moved part of this
[ADR 034](034-version-each-artifact-from-its-own-commits.md) replaces the version in `package.json` as the release trigger with a version worked out from the commits, and [ADR 035](035-promote-the-web-by-moving-environment-tags.md) drops `:latest` and moves `:dev` and `:prod` instead. The registry, the image's shape, the platform, `:main` and `:sha-<short>`, and publish-then-tag all stand.
:::

## Context

The web application is the whole front-end ([ADR 010](010-deliver-the-front-end-as-one-web-application-in-native-shells.md)), and the shells already name the origins they will load it from, so something has to serve it. Where is not decided, and that is not a reason to wait: choosing a host later should be a matter of pointing it at an artifact, not of building the pipeline that produces one. The artifact has to exist first, and it has to be neutral about where it lands.

Its shape is already settled by how the project runs locally. Every environment puts Caddy in front of the application on one origin, because the back-end paths belong to an ingress rather than to the application ([ADR 012](012-run-campfire-in-three-environments-on-one-origin.md)), so a container that is Caddy plus the built bundle is the deployed form of what developers already run. What is missing is publication – somewhere to put the image, and a rule for what a version means – and the repository already has the rule: a declared version is the release trigger for a skill ([ADR 025](025-publish-agent-skills-as-versioned-releases.md)), and `package.json` carries a CalVer version moved deliberately ([ADR 007](007-version-with-calver-on-a-rebased-history.md)). A second release model would be one too many.

## Decision

We publish the web application as a container image to the GitHub Container Registry, versioned from `package.json`.

- **The image is Caddy serving the bundle**, built by the workspace's own Dockerfile. Nothing else is in it, and nothing in it deploys itself.
- **It is published to `ghcr.io` under the repository's owner**, authenticated by the workflow's own token – no second account, no stored credentials.
- **The version in `package.json` is the release trigger**, exactly as `metadata.version` is for a skill. The workflow reads it on every merge to `main`, the git tag `web-v<version>` is that version's identity, and a version whose tag exists has shipped and is skipped. A new version publishes `:<version>` and `:latest`, and the tag is created after the push, so a tag never names an image that is not there.
- **Every merge also publishes `:main` and `:sha-<short>`**, for rollback and for pointing a staging deployment at one exact commit. `:<version>` is what a real deployment pins.
- **The image is built for `linux/amd64`, and only for it.** A server runs amd64; the machines that build the image are Apple silicon, and the artifact targets the deployment rather than the desk. The Dockerfile's build stage runs on the builder's own platform, since its output is static files with no architecture, so only the Caddy stage that ships is amd64 and nothing expensive runs under emulation. The script and the workflow pass the platform, so nobody types a flag.
- **The workflow publishes and stops.** It does not deploy, and it holds no host, no credentials, and no environment.

## Consequences

- A deployment becomes possible before a host is chosen. Any runtime that can pull an OCI image can run this, and choosing one does not reach back into the build.
- One release model in the repository. A version is a deliberate edit, its tag is its identity, and re-releasing means deleting the tag – the same sentence for a skill and for the application.
- The bump is easy to forget, and a forgotten bump publishes `:main` and `:sha-<short>` and quietly cuts no version. Skills close that gap with a check on every pull request; the web application does not have one yet, so a missed bump is silent.
- One architecture. An arm64 host cannot run this image, and `pnpm start:prod` on Apple silicon runs it under emulation, which the compose file asks for rather than tripping on. A second platform is a one-line change, and the tripwire for adding it is a host that exists, not one that might.
- The image is public once the repository is, so what goes into it is a distribution decision, not only a packaging one. It carries no signature, provenance attestation, or SBOM – the obvious thing to add first if it ever needs supply-chain guarantees.

## Alternatives considered

- **Deploy straight from continuous integration, with no registry.** There is no host to deploy to yet, and it would couple the build to whichever host is chosen – the coupling this decision exists to avoid.
- **Docker Hub.** A second account, stored credentials, and pull rate limits on anonymous consumers, for nothing `ghcr.io` does not already give a GitHub-hosted project.
- **Static hosting** – Pages, a CDN, an object store. It skips containers and costs less, and it breaks the arrangement the shells depend on: one origin that serves the application and routes the back-end paths. A container keeps the deployed shape identical to the developed one.
- **Build the image at deploy time from source.** Nothing to store between build and run, and the thing deployed would not be the thing that was tested – the whole reason to have an artifact.
- **Derive the version from commits, with release-please or similar.** It would close the forgotten-bump gap, put a bot in the commit history of a repository where the human commits deliberately, and need custom configuration to speak CalVer. The version tracks a release the maintainer intends, not one a tool infers.
- **Build for `linux/arm64`, or for both.** arm64 matches the machines the project is developed on and makes the default artifact the wrong one for any ordinary host – a trap for whoever does not know the flag. Both platforms publishes two manifests for one consumer, and nothing runs the arm64 one.
