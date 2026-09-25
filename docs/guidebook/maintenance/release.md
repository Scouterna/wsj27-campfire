# Release

Versioning and publication are settled and in use – each artifact's version is worked out from its own commits, four workflows publish what this repository produces, and prod is promoted by hand. How the shells reach a phone is an open decision.

## Versioning

Three things carry a version: the web image, the Android shell, and the Apple shell. Each has a version of its own, in Calendar Versioning's shape `YEAR.FEATURE.PATCH`, and each lives in a git tag – `web-v<version>`, `android-v<version>`, `apple-v<version>` ([ADR 034](/decisions/034-version-each-artifact-from-its-own-commits)). The tag is the source of truth for an artifact's last version; nothing in the tree carries one.

The next version is worked out from the commits since the artifact's last tag that touch its paths – the web's are the release workflow's own trigger list, Android's `apps/android/`, Apple's `apps/apple/`. A commit touching several artifacts counts toward each, and its message never decides which. The subject's type decides how far:

- **The feature segment**, resetting the patch – any `feat`, or any type marked `!`.
- **The patch segment** – otherwise, any `fix` or `revert`.
- **Nothing** – otherwise. `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, and `chore` move nothing.

Several commits earn at most one version, the largest bump among them. A feature bump in a later year than the last version's gives `<year>.1.0`; a patch stays on its version's year. An artifact with no tag yet starts at `<year>.1.0`.

The rule is one piece of TypeScript under `scripts/release/`, tested on every pull request, and `pnpm version:next <web|android|apple>` asks what an artifact's next version would be. It reads the tags and the history, so it needs a full clone.

The three numbers drift apart, and that is expected: they name three binaries, not one release. A newer web in an older shell is the bridge working as designed ([ADR 018](/decisions/018-bridge-the-web-application-and-the-shells-with-versioned-messages)), and the bridge's own protocol version is a fourth number, unrelated to these. Anywhere a person sees a version, the artifact is named beside it, because the strings look alike.

## The version in a build

Every workspace `package.json` says `0.0.0`, `apps/apple/config/Shared.xcconfig` says `0.0.0` on build number `1`, and so does `versionName` in `apps/android/config/app/build.gradle.kts`. Those are placeholders, and no release edits them. A release passes the version in:

- **The web image** takes `CAMPFIRE_VERSION` as a Docker build argument, and the Vite build writes it into `index.html` as `<meta name="campfire-version">`. Read it from the browser's console: `document.querySelector('meta[name="campfire-version"]').content`.
- **Android** reads the Gradle properties `campfire.version` and `campfire.build` – `-Pcampfire.version=2026.3.0 -Pcampfire.build=412`.
- **Apple** takes `CAMPFIRE_VERSION_NUMBER` and `CAMPFIRE_BUILD_NUMBER` as build settings on the `xcodebuild` command line, over the xcconfig, and `project.yml` maps them into `Info.plist`.

A build given nothing – `pnpm build:*`, `pnpm start:*`, Xcode, Android Studio – is `0.0.0` build `1`. That is the honest value for a build that is not a release, and no build reads git to claim otherwise.

## Releasing

Four workflows write somewhere ([ADR 009](/decisions/009-check-and-release-with-small-github-actions-workflows)). Three of them release on a merge to `main`; the fourth is promotion, started by hand.

| What          | Workflow          | Runs on                                                                | Publishes to                                   |
| ------------- | ----------------- | ---------------------------------------------------------------------- | ---------------------------------------------- |
| The web image | Release web       | A merge to `main` touching the web application, or by hand             | `ghcr.io/scouterna/wsj27-campfire`, and `:dev` |
| The web image | Promote web       | By hand, naming a version                                              | `:prod` on the same image                      |
| The skills    | Release skills    | A merge to `main` touching `.agents/skills/`, or by hand               | A GitHub Release per skill                     |
| The guidebook | Release guidebook | A merge to `main` touching `docs/` or the VitePress config, or by hand | GitHub Pages                                   |

**The web image.** Every merge that touches the web application publishes `:main` and `:sha-<short>` – a moving pointer, and an immutable one to roll back to. When the merge earns a version, the same build carries it and also publishes `:<version>`; the git tag `web-v<version>` is created once the image is there, so a tag never names an image that failed to publish; and `:dev` is moved to that image last, so dev only ever follows a version that finished releasing ([ADR 026](/decisions/026-publish-the-web-application-as-a-container-image), [ADR 035](/decisions/035-promote-the-web-by-moving-environment-tags)). A merge that earns nothing publishes `:main` and `:sha-<short>` and creates no tag. The image is amd64 and only amd64 – the cluster's platform. Releases queue rather than race and are never canceled in flight, because a canceled release can leave a tag without its image. A failed release is retried by re-running it or starting it by hand: it works out the same version, because the tag was never created, and overwrites whatever the failed run left.

**The skills.** Each skill under `.agents/skills/` is published as its own GitHub Release when its `<name>-v<version>` tag does not exist yet; an unchanged version is skipped ([ADR 025](/decisions/025-publish-agent-skills-as-versioned-releases)). A pull request that edits a skill and leaves its version alone fails the check, because the alternative is a change that silently never ships.

**The guidebook.** It builds on every pull request that touches `docs/`, and a merge to `main` deploys the built site to GitHub Pages ([ADR 029](/decisions/029-render-the-guidebook-with-vitepress)). The site is served from the repository's own project URL, which is why every link in it resolves from that subpath rather than from a domain root.

## Deploying

Two tags on the image say what each environment runs, and nothing else moves ([ADR 035](/decisions/035-promote-the-web-by-moving-environment-tags)).

**Dev follows releases.** `:dev` moves to every new web version as it is released, so what the management team tests at `campfire.wsj27.scouterna.net` is what could be promoted. It never points at a digest that does not also carry a released `:<version>`. The move is its own job, run in the GitHub environment `dev`, so each one is a deployment linking to the site; a merge that earns no version moves nothing and records nothing. When the move fails after the tag exists, re-running that failed job repeats it, but a new run of the workflow does not – it earns no version – so the run's summary also gives the command that moves `:dev` by hand.

**Prod is promoted.** `promote_web.yml` is started from the Actions tab or the command line, naming a version:

```sh
gh workflow run promote_web.yml -f version=2026.9.0
```

It refuses a version that is not CalVer-shaped, has no `web-v<version>` tag, or has no `:<version>` image, and a refusal leaves `:prod` where it was. Accepted, it copies the manifest behind `:<version>` to `:prod` – nothing is built, pulled, or pushed but the tag, so the digest is the one dev ran. Rolling back is a promotion of an earlier version; there is no other way to move `:prod`. Promotions queue and never cancel, like releases.

Every promotion runs in the GitHub environment `prod`, so each one – accepted or refused – is a deployment on the repository's Deployments page, linking to `campfire.wsj27.se`: who started it, which version, and how it ended. The run's summary adds the new digest, the digest `:prod` pointed at before, and the command that rolls back.

**The cluster side is a step by hand.** Moving a tag restarts nothing. Prod, at `campfire.wsj27.se`, is deployed by a step on the cluster that takes what `:prod` points at, and how dev follows `:dev` is settled with the people who run it ([ADR 027](/decisions/027-run-the-back-end-on-kubernetes-in-azure)). A promotion holds no credentials for the cluster.

The direction for what runs there is recorded: the back-end services as containers on Kubernetes in Azure, with the web image behind the same ingress, so production keeps the one-origin rule the local environment already keeps ([ADR 027](/decisions/027-run-the-back-end-on-kubernetes-in-azure), [ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)). `pnpm start:prod` is the shape of it on one machine: Caddy, the real auth service, the real project API, and the built image serving the web, all on `http://localhost:8000` ([The environments](../development/environments)).

## Reaching a phone

Both shells build and neither ships.

- **Android.** The prod flavor names the production origin and nothing more: it is a debuggable build with no signing configuration. `build_android.yml` proves the shell assembles, and stops there.
- **Apple.** There is no Apple workflow at all, because a build needs macOS with Xcode and no runner is spent on it. The pre-push hook is the whole gate, and it skips out loud where the toolchain is missing.
- **Both.** The three environments share one identity – `se.scouterna.campfire` on both platforms – so they cannot sit on a phone side by side. That is the accepted cost of not maintaining three identities for a difference that is one URL.

How a shell will be released is decided and recorded, and what it waits on is signing and store upload from continuous integration, an open decision of its own ([ADR 034](/decisions/034-version-each-artifact-from-its-own-commits)). Each shell gets a workflow started by hand, with no inputs: it works out that platform's version from its own commits and stops when there is none, takes its build number from the run's number, builds and uploads with both, and creates `<platform>-v<version>` last. A failed shell release is retried as a new run rather than a re-run, so a store never sees a build number twice, and neither shell's release touches the other's version.

Whether the shells reach leaders through the public stores, TestFlight, or managed distribution is undecided ([ADR 010](/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells)), and the answer brings signing, store accounts, a beta track, and a cadence with it. Asking hundreds of leaders to install the application has to be one instruction, which is the force that will decide it. Whatever is chosen is recorded as an ADR and described here once it runs.
