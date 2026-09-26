# 034. Version each artifact from its own commits

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-25" /></p>
:::

## Context

[ADR 007](007-version-with-calver-on-a-rebased-history.md) gave the repository one CalVer version, moved by hand in `package.json` and copied into `Shared.xcconfig` and the Android `versionName`. The three artifacts do not ship together: the web deploys on every merge, and each shell waits on its own store ([ADR 018](018-bridge-the-web-application-and-the-shells-with-versioned-messages.md)). One number names none of them well.

Prod is promoted rather than deployed ([ADR 035](035-promote-the-web-by-moving-environment-tags.md)), taking only an image dev already ran, so a version has to exist before dev tests the build. A bump commit afterward builds a second image, and the forgotten bump [ADR 026](026-publish-the-web-application-as-a-container-image.md) named becomes a release that cannot happen.

## Decision

We give each artifact a version of its own, worked out from the commits that touch it, and keep the version out of the tree.

- **Each artifact has its own tag.** The web image, the Android shell, and the Apple shell each carry a CalVer version, `YEAR.FEATURE.PATCH`, released as `web-v`, `android-v`, or `apple-v` plus the version. The tag is the source of truth. The bridge's protocol version is untouched.
- **Paths decide which artifact a commit counts toward, and the type decides how far.** The web's paths are the release workflow's trigger list, and each shell's is its directory. Among a tag's later commits, any `feat` or `!` moves the feature segment and resets the patch; otherwise any `fix` or `revert` moves the patch. Several commits earn one version, the largest bump.
- **The year rule holds.** A feature bump in a later UTC year gives `<year>.1.0`, and a patch stays on its year. An untagged artifact starts at `<year>.1.0`.
- **The rule is written once**, tested on every pull request, and runnable locally.
- **The web version is automatic.** A push to `main` that earns a version builds the image with it, publishes `:<version>`, creates the tag once the image exists, and moves `:dev`. One that earns none publishes `:main` and `:sha-<short>` only.
- **The tree holds `0.0.0`.** A release passes the version into the build, a build given nothing is `0.0.0`, and no build reads git.
- **A shell is released by hand, per shell**, taking its build number from the release run, so a store never sees one twice. Signing and store upload from continuous integration are decided separately.

The history stays as ADR 007 has it – Conventional Commits with no scope, and a rebased, linear history – because it is the log the rule reads.

## Consequences

- A web `feat` or `fix` becomes a version with nobody acting, and nothing can be forgotten.
- The three numbers drift apart on purpose, so a version is always shown with its artifact named.
- The rule needs the full history and the tags, so a shallow clone answers wrongly.
- Deciding what reaches prod moves from the version to promotion.

## Alternatives considered

- One version moved by hand – it cannot exist before dev tests the build.
- release-please or similar – a bot committing to a history written by hand.
