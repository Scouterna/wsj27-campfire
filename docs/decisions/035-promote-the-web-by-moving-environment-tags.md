# 035. Promote the web by moving environment tags

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-25" /></p>
:::

## Context

[ADR 026](026-publish-the-web-application-as-a-container-image.md) publishes the web image and stops, and [ADR 027](027-run-the-back-end-on-kubernetes-in-azure.md) leaves how a deploy is triggered undecided. Two environments now exist to deploy to, and they want different things. Dev should take every web release as it happens, so the management team tests what could ship. Prod should change only when someone decides it should, and only to an image dev already ran – never rebuilt in between. Every change to prod should be visible: who, what, when, and what it replaced.

The cluster is run by people outside this repository, and its credentials do not belong in GitHub. Whatever signals a deploy has to be something a workflow can write with the token it already has.

## Decision

We deploy by moving two tags on the image, and nothing else.

- **`:dev` follows releases.** After the release workflow has published `:<version>` and created `web-v<version>` ([ADR 034](034-version-each-artifact-from-its-own-commits.md)), it moves `:dev` to that version's digest. A push that earns no version moves nothing. `:dev` only ever points at a digest that also carries a released `:<version>`.
- **`:prod` moves by promotion.** A workflow started by hand, `promote_web.yml`, takes a version as its one input. It refuses a version that is not CalVer-shaped, has no `web-v<version>` tag, or has no `:<version>` image, and a refusal leaves `:prod` where it was. Accepted, it copies the manifest behind `:<version>` to `:prod` with `docker buildx imagetools create` – nothing is built, pulled, or pushed but the tag, so the digest is the one dev ran. Rolling back is a promotion of an earlier version; there is no other rollback.
- **Every promotion is a deployment.** The job runs in a GitHub environment named `prod`, so each run – accepted or refused – is a deployment record with its actor, its status, and its run, and the repository's Deployments page is the history. The run's summary names the version, the outcome, the new and the previous digest, and the command that rolls back.
- **`:latest` is gone.** Nothing should run "whatever was last", and the release no longer publishes it. The tag that exists is removed by hand once the people who run the cluster confirm nothing pulls it.
- **The cluster side is a manual step.** Moving a tag restarts nothing. Prod is deployed by a step on the cluster that takes what `:prod` points at; how dev follows `:dev` is settled with the people who run it. A promotion needs no credentials for the cluster and holds none.
- **`promote_*` is a workflow kind.** [ADR 009](009-check-and-release-with-small-github-actions-workflows.md) names four; this adds one that moves a pointer to something already released, runs only by hand, and takes an input. Like a release it queues and never cancels in flight, because a canceled promotion can leave a moved tag without its record.

This amends ADR 026: the `package.json` trigger goes to ADR 034, `:latest` goes here, and the rest of it – `ghcr.io`, Caddy plus the bundle, `linux/amd64`, `:main` and `:sha-<short>`, publish then tag – stands.

## Consequences

- Prod changes only when a person names a version, and only to an image that was released and offered to dev. The image promoted is byte-for-byte the image tested.
- ADR 027's open question is answered on GitHub's side: the trigger is a moved tag. The cluster's half is a manual step, and how dev follows `:dev` is theirs to decide.
- A promotion is one API call away from anyone with write access to the repository. The `prod` environment can require a reviewer later; that is a setting, not a change here.
- Nothing checks that dev actually ran the version, or for how long. A promotion of a version dev never had is legal and visible.
- The `:dev` move is the last step of a release. If it fails after the tag exists, a retry earns nothing and `:dev` lags until the next version; the summary says so and gives the one command that fixes it. Moving it before the tag would let `:dev` point at a version that never finished releasing, which is the worse failure.
- Two tags now move without a commit behind them, so the registry, not the history, says what each environment runs. The Deployments page and the run summaries are the record.

## Alternatives considered

- **Pin each environment's version in a configuration repository the cluster syncs from.** Every change becomes a commit and a pull request with a history for free, and it needs a sync tool in the cluster and a second repository to keep in step. The people who run the cluster may still choose it on their side; this decision does not preclude it.
- **Deploy straight from a workflow with cluster credentials.** It puts deploy access to the cluster in GitHub, and it ties the repository to the cluster's shape, which ADR 027 kept out.
- **Rebuild the image at promotion time from the tagged commit.** The thing promoted would not be the thing tested, which is the whole reason to promote a digest.
- **A separate rollback workflow.** A second way to move the same tag, with the same checks; promoting an earlier version is the rollback.
- **Keep `:latest` as an alias for the newest version.** An environment that pulled it would take a release nobody chose for it, and nothing needs it.
- **A pull-request-driven promotion**, editing a file in this repository. It gives review for free, and it puts a deploy in the commit history of the code, which then has to be released again to move.
