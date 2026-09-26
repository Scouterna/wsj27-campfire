# Platform Reference

Where the WSJ27 services run, how they reach Campfire, and the two neighbors beside them – the CMS and Discord.

## Contents

- [The cluster](#the-cluster)
- [Paths on one origin](#paths-on-one-origin)
- [Deploying](#deploying)
- [The CMS](#the-cms)
- [Discord](#discord)

## The cluster

The services run on Scouterna's shared Kubernetes cluster in Azure, set up from the public `azure-webservices` repository. It is one cluster for many Scouterna projects, not a WSJ27 cluster.

- **Ingress** is Traefik, with certificates from cert-manager and Let's Encrypt. Kong runs on the cluster too, so a manifest names `ingressClassName: traefik` or lands on the wrong controller.
- **Cluster services** – ingress, certificates, the shared Postgres, monitoring, backups – are managed with ArgoCD from `azure-webservices`. A project's own workloads may be applied by hand instead, and commonly are.
- **Secrets** reach the cluster through External Secrets Operator from Key Vault, with the Key Vault CSI driver kept as an opt-in fallback.
- **Namespaces** – a project gets `<project>-dev` and `<project>-prod`, and occasionally `-staging`. The WSJ27 services use `proj-wsj27-dev` and `proj-wsj27-prod`; the CMS and the Discord bot run in a plain `wsj27` namespace.

## Paths on one origin

Campfire's environments all answer on one origin, and the back-end paths are the same in each (Campfire's ADR 012):

| Path                 | Reaches                                                      |
| -------------------- | ------------------------------------------------------------ |
| `/api/auth`          | `wsj27-auth-api`, prefix stripped                            |
| `/api/project`       | `wsj27-project-api`, prefix stripped                         |
| `/_services/cms`     | `wsj27-cms`, with the base path built into its image         |
| `/_services/handbok` | The public handbook, rewritten by the CMS onto its own pages |

The dev origin is `campfire.wsj27.scouterna.net` and the prod origin `campfire.wsj27.se`. Locally, Caddy stands in for the ingress with the same rules.

## Deploying

- **Images** are built and published by each repository's workflow on a push. The workflows build images and do not run tests.
- **The services** follow a branch model: work merges into `dev`, which publishes a `:dev` image, then `dev` into `main`. Rolling a new image out to the cluster is a manual step.
- **The CMS and the Discord bot** keep their Kubernetes manifests in their own repositories and pin images by commit SHA, never `latest`, so a rollback is unambiguous.
- **The web image** moves through `:dev` and `:prod` tags (Campfire's ADR 035).

## The CMS

`wsj27-cms` is a Payload and Next.js content system, forked from Jamboree 2026's, holding the leader handbook – chapters and ordered pages that editors manage as data, so a new audience is a new chapter rather than a deploy.

- **Reading** the handbook under `/_services/handbok` is public.
- **Editing** under `/_services/cms` signs in only through `wsj27-auth-api`, on the same host, because the session cookie is scoped to it. Anyone with a `wsj27:cmt` role may edit; others need `wsj27-cms:editor`, and managing users needs `wsj27-cms:admin`.
- If the CMS's discovery URL answers with an HTML page rather than JSON, it treats everyone as signed out instead of failing. When everyone appears signed out, check that URL's content type, not its status.

## Discord

Discord is each unit's main channel for day-to-day communication. The contingent's server gives deltagare, ledare, IST, and the CMT separate spaces, with channels per unit and per IST patrol, and roles assigned automatically from Scoutnet registration data.

- **The server's shape** – its roles, channels, permissions, and moderation – is Terraform in `wsj27-infra`, applied by hand. A nightly plan reports when the live server drifts from it, and never applies anything.
- **Linking** runs through the public `discord-scoutid-linked-role` bot. A member starts Discord's own Linked Role flow, signs in with ScoutID, and the bot reads their member number, looks their registration up in Scoutnet's participant API, and assigns the matching roles and nickname. It stores only the link between Discord account and member number, in an Azure storage table, and resyncs the whole server nightly.
- **Neither Discord bot calls the WSJ27 services.** The linking bot reads ScoutID and Scoutnet directly, so its roles come from the registration data, not from the participants service's `wsj27:` roles.
- **`wsj27-discord-bot`** is a separate, minimal bot with nothing beyond a health command.
