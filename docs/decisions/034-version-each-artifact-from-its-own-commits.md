# 034. Version each artifact from its own commits

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-25" /></p>
:::

## Context

[ADR 007](007-version-with-calver-on-a-rebased-history.md) gave the repository one CalVer version, moved by hand in `package.json` after a batch of changes, and copied by hand into `Shared.xcconfig` and the Android `versionName`. Two things have changed since.

The three artifacts do not ship together. The web image deploys in minutes on every merge; each shell waits on its own store, on its own review clock, and a newer web in an older shell is the bridge working as designed ([ADR 018](018-bridge-the-web-application-and-the-shells-with-versioned-messages.md)). One number for three binaries names none of them well, and moving it for a web fix asks the shells to claim a release they did not have.

And prod is about to be promoted rather than deployed ([ADR 035](035-promote-the-web-by-moving-environment-tags.md)): dev takes every web release, and prod takes only an image dev already ran. A version has to exist before dev tests the build. A bump commit after the fact builds a second image, so the image tested would not be the image promoted. The forgotten bump [ADR 026](026-publish-the-web-application-as-a-container-image.md) named as a silent failure becomes, under promotion, a release that cannot happen at all.

## Decision

We give each artifact a version of its own, worked out from the commits that touch it, and keep the version out of the tree.

- **Three versions, three tag prefixes.** The web image, the Android shell, and the Apple shell each carry a CalVer version, `YEAR.FEATURE.PATCH`, and each is released as a git tag – `web-v<version>`, `android-v<version>`, `apple-v<version>`. The tag is the source of truth for an artifact's last version. The bridge's protocol version is untouched and stays as ADR 018 has it.
- **Paths decide which artifact a commit counts toward; the type decides how far.** A commit since an artifact's last tag counts toward it if it touches the artifact's paths – the web's are the release workflow's own trigger list, Android's `apps/android/`, Apple's `apps/apple/` – and a commit touching several counts toward each. Among the counting commits, any `feat` or any type marked `!` moves the feature segment and resets the patch; otherwise any `fix` or `revert` moves the patch; otherwise nothing moves. Several commits earn at most one version, the largest bump among them.
- **The year rule holds.** A feature bump in a later UTC year than the last version's gives `<year>.1.0`; a patch stays on its version's year. An artifact with no tag yet gets `<year>.1.0` from its first counting `feat` or `fix`.
- **The rule is written once**, as pure TypeScript under `scripts/release/`, run by Node directly like `scripts/structurizr/run.ts`, tested against a table of subjects on every pull request, and runnable locally as `pnpm version:next <artifact>`.
- **The web version is automatic.** Every push to `main` that touches the web's paths runs the rule. With a version, the release builds the image with it, publishes `:<version>`, creates the tag once the image is there, and moves `:dev`. Without one, it publishes `:main` and `:sha-<short>` and creates nothing. The hand-made bump commits stop.
- **The tree holds `0.0.0`.** Every workspace `package.json`, `Shared.xcconfig`, and the Android `versionName` carry a placeholder, and no release edits a file. The version is passed in: a Docker build argument the Vite build writes into `index.html` as a `campfire-version` meta tag, Gradle properties `campfire.version` and `campfire.build`, and the Xcode build settings `CAMPFIRE_VERSION_NUMBER` and `CAMPFIRE_BUILD_NUMBER` on the command line. A build given nothing – `pnpm build:*`, `pnpm start:*`, Xcode, Android Studio – is `0.0.0` build `1`, and no build reads git.
- **A shell is released by hand, per shell, once it can be.** The design: a workflow started by hand with no inputs, checking out the full history, running the rule for its platform and stopping on no version, taking its build number from the run's number, building and uploading with them, and creating `<platform>-v<version>` last. A failed shell release is retried as a new run, not a re-run, so a store never sees a build number twice. Neither shell touches the other's version. No such workflow exists: both wait on signing and store upload from continuous integration, which is an open decision of its own.

What ADR 007 decided about the history stands unchanged and is restated here so this record reads whole: Conventional Commits, `<type>: <description>` with no scope and the eleven types, and a rebased, linear history with no merge commits and no squashing – the log the rule reads.

## Consequences

- A merge with a web `feat` or `fix` becomes a web version with nobody acting, and nothing can be forgotten. A commit that touches only a shell moves no web version, and a web fix moves no shell.
- The three numbers drift apart, and that is the point: they name three binaries, not one release. Anywhere a person sees a version, the artifact is named beside it, because CalVer strings look alike.
- Nothing is written back to the history – the version is computed from it, not committed to it – which is what separates this from the release-please shape ADR 026 rejected.
- The rule needs the full history and the tags, so a workflow that runs it checks out with `fetch-depth: 0`, and a shallow clone answers wrongly.
- A run behind the newest release tag earns nothing, so a retry after a later release publishes no second version; a retry before it recomputes the same version and overwrites what the failed run left.
- `0.0.0` is the honest value for a local build, which is not a release. It stays numeric because Apple accepts only dot-separated integers.
- ADR 007's consequence that a release is a deliberate act no longer holds for the web. Deciding what reaches prod moves to promotion. [ADR 020](020-generate-the-xcode-project-with-xcodegen.md)'s consequence that a release moves three files by hand no longer holds either; XcodeGen's own decision does.
- The web's artifact paths and its release trigger are one list, so a change to the release workflow itself counts as a web change – a `ci:` commit there earns nothing, a `fix:` earns a patch.

## Alternatives considered

- **Keep one version, moved by hand, as ADR 007 has it.** It cannot exist before dev tests the build, and it names three binaries with one number.
- **Cut web releases by hand, with the number worked out.** It puts a second manual step between a fix and prod, for a decision – what reaches prod – that promotion already makes.
- **A tool that derives the version and commits it – release-please or similar.** ADR 026 rejected it for putting a bot in a history written by hand and for not speaking CalVer. Both hold; neither applies to a rule that writes nothing back.
- **Read the version from git inside each build.** Xcode's script sandbox blocks it, shallow clones carry no tags, and a local build would claim the last release's number.
- **A version in the tree that the release edits.** A commit on `main` from a workflow, a second image per release, and a race with the next merge.
- **A shell script with its own test framework.** It would be the repository's first tested shell script, and the first with a test framework; TypeScript under `scripts/` is already checked, linted, and tested.
- **The same version for both shells.** Two stores on two clocks; a version cut for one would be a lie for the other. Parity between them is tracked per bridge message, not by matching numbers.
