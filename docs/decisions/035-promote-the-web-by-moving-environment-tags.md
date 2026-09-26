# 035. Promote the web by moving environment tags

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-25" /></p>
:::

## Context

[ADR 026](026-publish-the-web-application-as-a-container-image.md) publishes the web image and stops, and the cluster that runs it is operated outside this repository ([ADR 027](027-run-the-web-beside-the-back-end-on-scouternas-cluster.md)). Dev should take every web release, so the contingent management tests what could ship. Prod should change only when someone decides, only to an image dev already ran, and visibly – who, what, when, and what it replaced.

The cluster's credentials do not belong in GitHub, so a deploy has to be signaled by something a workflow can write with the token it has.

## Decision

We deploy by moving two tags on the image, and nothing else.

- **`:dev` follows releases.** After a release ([ADR 034](034-version-each-artifact-from-its-own-commits.md)), a job in a GitHub environment named `dev` moves `:dev` to the version's digest, recorded as a deployment linking to `campfire.wsj27.scouterna.net`. A push that earns no version moves nothing.
- **`:prod` moves by promotion.** A workflow started by hand with a released version points `:prod` at that version's own image, so the digest is the one dev ran, and refuses a version that was never released. Rolling back is promoting an earlier version.
- **Every promotion is a deployment** in a GitHub environment named `prod`, linking to `campfire.wsj27.se`.
- **There is no `:latest`**, because nothing should run whatever was last.
- **The cluster side is not in this repository.** Moving a tag restarts nothing, and the cluster takes what the tag points at. A promotion holds no credentials for the cluster.
- **`promote_*` is a workflow kind** beside those of [ADR 009](009-check-and-release-with-small-github-actions-workflows.md) – started by hand, taking an input, and queued rather than canceled, because a canceled promotion can leave a moved tag without its record.

This amends ADR 026: `:latest` is dropped, and the rest of it stands.

## Consequences

- Prod changes only when a person names a version, and the image promoted is byte-for-byte the image tested.
- A promotion is one call away from anyone with write access, until the `prod` environment requires a reviewer.
- Nothing checks that dev ran a version, or for how long, and promoting one it never had is legal and visible.
- The registry, not the history, says what each environment runs, and the Deployments page is the record.

## Alternatives considered

- A configuration repository the cluster syncs from – a sync tool and a second repository; the cluster's people may still choose it on their side.
- Deploying with cluster credentials – deploy access in GitHub, and the cluster's shape in this repository.
- Promotion by pull request – a deploy in the code's history, which then has to be released again.
