# 027. Run the web beside the back-end on Scouterna's cluster

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Campfire serves the web and the back-end paths from one origin ([ADR 012](012-run-campfire-in-three-environments-on-one-origin.md)), and the web ships as a container image ([ADR 026](026-publish-the-web-application-as-a-container-image.md)). Scouterna runs the WSJ27 back-end services on its Kubernetes cluster in Azure, and people outside this repository operate it.

## Decision

We run the web image on that cluster, behind the same ingress as the back-ends, on `campfire.wsj27.scouterna.net` for dev and `campfire.wsj27.se` for prod. The ingress routes each back-end's prefix under `/api/` to it, `/services/` and `/_services/` to the services beside them, and everything else to the web – the deployed form of `config/environments/*/Caddyfile`.

## Consequences

- A developer's front door and the deployed one have the same shape.
- Campfire's deployment depends on the people who run the cluster, and what it may run there is agreed with them.
- The web image is built for `linux/amd64` only, so the cluster's nodes must be amd64.
- Nothing in the web image is specific to Azure.
