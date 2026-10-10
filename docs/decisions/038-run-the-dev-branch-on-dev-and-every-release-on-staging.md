# 038. Run the dev branch on dev, and every release on staging

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-10-09" /></p>
:::

## Context

[ADR 035](035-promote-the-web-by-moving-environment-tags.md) had dev follow every release, so the only way to show someone an idea running was to merge it. An idea that may never ship should not need a version, and a release should still be tried somewhere before prod.

## Decision

We give each of three environments its own source, each signaled by a tag on the web image.

- **`:dev` follows the `dev` branch.** Every push to it, force-pushes included, builds the image and publishes it as `:dev`, recorded as a deployment in the `dev` environment. The branch never merges into `main`, and it is recreated from `main` whenever it has drifted too far.
- **A dev build is not a release.** It earns no version and creates no tag, so its image says `0.0.0`, and it never touches `:staging` or `:prod`.
- **`:staging` follows releases**, the role ADR 035 gave `:dev`, recorded as a deployment in the `staging` environment linking to `staging.campfire.wsj27.se`.
- **Each shell has a staging build** beside its dev and prod builds, loading `staging.campfire.wsj27.se`, so a release is tried in the apps before prod as well as in a browser.
- **`:prod` still moves only by promotion**, now of an image staging ran.
- **`preview_*` is a workflow kind** beside those of [ADR 009](009-check-and-release-with-small-github-actions-workflows.md) – it publishes a build from a branch other than `main`, and a newer push cancels the one in flight, because only the newest build is worth publishing.

This amends [ADR 034](034-version-each-artifact-from-its-own-commits.md) and ADR 035: `:staging` replaces `:dev` as the tag a release moves, and the rest of both stands.

## Consequences

- Anyone can put work on dev without a pull request, a version, or a merge.
- What dev runs is whatever was pushed last, so two people showing work at once overwrite each other.
- Staging needs a site of its own on the cluster ([ADR 027](027-run-the-web-beside-the-back-end-on-scouternas-cluster.md)), and a sign-in that returns to its host name ([ADR 019](019-authenticate-on-the-app-origin-through-scoutid.md)), both agreed with the people who run them.
- Nothing reaches dev from `main` until the branch is recreated, so dev can run code older than staging's.

## Alternatives considered

- Building every pull request into a preview site of its own – a site per branch on a cluster this repository does not operate.
- Merging `dev` into `main` as the services do – unreleasable work would ride into a release.
