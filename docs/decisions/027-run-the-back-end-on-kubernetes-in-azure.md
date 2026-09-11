# 027. Run the back-end on Kubernetes in Azure

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

The web application is a container image with no host chosen ([ADR 026](026-publish-the-web-application-as-a-container-image.md)), and the back-end is Python services in their own repositories, delivered the same way ([ADR 013](013-build-the-back-end-as-python-services-in-their-own-repositories.md)). So the question is not where a bundle of static files goes, which any host answers. It is what runs a handful of containers behind one hostname and routes each `/api/<service>` prefix and everything else to the right one – because one origin is the rule the shells and the web application depend on ([ADR 012](012-run-campfire-in-three-environments-on-one-origin.md)), and `config/environments/*/Caddyfile` is that routing written for a laptop. Something has to be its deployed twin.

Scouterna already runs a Kubernetes cluster in Azure, with people who operate it. And two things make the answer hard to defer: a service repository needs to know what it is being written toward – a container is a different artifact from a function or a platform-specific bundle – and the first service that ships needs somewhere to ship to, which is not a thing to decide in the week it is ready.

## Decision

We run the back-end services, and the web image beside them, as containers on Kubernetes in Azure, behind one ingress serving the app's hostname – `campfire.wsj27.scouterna.net` for dev and `campfire.wsj27.se` for prod.

- **Every deployable is already an OCI image**, and nothing here reaches back into how one is built.
- **The ingress is the deployed form of the Caddyfiles.** Each `/api/<service>` prefix to its service, everything else to the web container. One origin becomes one hostname, and a developer's front door and the deployed one stay the same shape.
- **Kubernetes in Azure, because Scouterna already runs one.** The cluster exists, the people who operate it exist, and a product that is several containers behind one router is the thing Kubernetes describes natively.
- **Nothing in this repository changes yet.** The release workflow still publishes and stops, and deployment arrives with the first service.

This record is a direction, not a platform. Not decided: the cluster's shape and size, managed or self-run, how secrets reach it, the data stores, the ingress controller and certificate flow, observability, and how a deploy is triggered. Each is decided when the first service ships, and recorded then.

## Consequences

- Kubernetes is more machinery than two containers need. The operational knowledge sits with the people who already run the cluster rather than with this team, and Campfire's deployment depends on them.
- Campfire is a tenant on a shared cluster, so what it may run, how it is isolated, and what it costs the contingent are agreed with the people who operate it rather than decided here.
- The web image is `linux/amd64` only, so the cluster's nodes are amd64 or the image grows a second platform – a constraint to know before deploy day rather than on it.
- Only a dev cluster exists. Until a prod one does, `prod` means what ADR 012 says – the real artifact on a laptop against a dev back-end.
- The project spans two clouds. GitHub holds the source, the workflows, and the images; Azure runs them, and the images cross that line on every deploy through a pull secret neither side owns alone.
- Nothing in the design is Azure-specific. The artifacts are OCI images and the routing is an ingress rule, so a change of cloud is redeploying rather than rebuilding.

## Alternatives considered

- **A managed platform – Azure Container Apps or App Service.** The same images with less to operate, and a second platform to learn beside the cluster that already exists. Path-routing several services under one hostname, in the shape `config/environments/` already describes, is native on an ingress and vendor-specific on a platform.
- **One virtual machine running Docker Compose.** The environments are compose files, so a small server would run them nearly unchanged. It makes a single machine the whole product during the three weeks when a broken flow has to be fixable in minutes, with nothing to roll to – and it is a machine nobody runs today.
- **Serverless functions.** No idle bill through the quiet years before camp. The back-end is ordinary HTTP services, not functions – each would be rewritten to fit – and cold starts land on people standing in a field on a bad connection.
- **Another cloud – AWS, Google Cloud, or a European host such as Hetzner.** Some run containers more cheaply, and none is where Scouterna already is. The decision is close to reversible: the artifacts and the routing carry over.
- **Decide nothing until camp gets closer.** A plan rather than a decision. ADR 026 built a host-neutral artifact precisely so this could be answered now, and answering it is what lets the first service be written toward something real.
