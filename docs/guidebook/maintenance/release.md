# Release

Versioning and publication are settled and in use – the version moves by hand on a rule, and three workflows publish what this repository produces. Deployment is partly by hand, and how the shells reach a phone is an open decision.

## Versioning

The version in the root `package.json` is `2026.8.1`: Calendar Versioning in the shape `YEAR.FEATURE.PATCH` ([ADR 007](/decisions/007-version-with-calver-on-a-rebased-history)).

- **`2026`** – the year of the feature release. The first feature release in a new year adopts that year; a patch stays on the year of the feature it patches and never advances it.
- **`1`** – the feature release, moved by a `feat`.
- **`0`** – the patch, moved by a `fix`. Every other commit type – `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, and `revert` – moves nothing.

The commit type says which segment should move. Nothing moves it for you: there is no changelog tool and no version script, so the bump is a deliberate edit to `package.json` in the commit that earns it. That edit is the whole ceremony, and it is what the release workflows read.

Two other files carry the same number by hand – `CAMPFIRE_VERSION_NUMBER` in `apps/apple/config/Shared.xcconfig` and `versionName` in `apps/android/config/app/build.gradle.kts`, both `2026.8.1`, both on build number 1. Nothing keeps the three in step. A version bump is three edits, or an inconsistency waiting to be found.

## Releasing

Three workflows publish something, and each of them treats an unshipped version as the trigger rather than a tag pushed by hand ([ADR 009](/decisions/009-check-and-release-with-small-github-actions-workflows)).

| What          | Workflow          | Runs on                                                                | Publishes to                       |
| ------------- | ----------------- | ---------------------------------------------------------------------- | ---------------------------------- |
| The web image | Release web       | A merge to `main` touching the web application, or by hand             | `ghcr.io/scouterna/wsj27-campfire` |
| The skills    | Release skills    | A merge to `main` touching `.agents/skills/`, or by hand               | A GitHub Release per skill         |
| The guidebook | Release guidebook | A merge to `main` touching `docs/` or the VitePress config, or by hand | GitHub Pages                       |

**The web image.** Every merge that touches the web application publishes `:main` and `:sha-<short>` – a moving pointer for a staging deployment, and an immutable one to roll back to. When the version in `package.json` has no `web-v<version>` tag yet, the same build also publishes `:<version>` and `:latest`, and the git tag is created last, so a tag never names an image that failed to publish ([ADR 026](/decisions/026-publish-the-web-application-as-a-container-image)). The image is amd64 and only amd64 – the cluster's platform ([ADR 026](/decisions/026-publish-the-web-application-as-a-container-image)). Releases queue rather than race, and are never canceled in flight, because a canceled release can leave a tag without its image. Re-releasing a version means deleting its tag.

The workflow publishes and stops. It holds no host, no credentials, and no environment, which is what lets the deployment question stay open without blocking the artifact.

**The skills.** Each skill under `.agents/skills/` is published as its own GitHub Release when its `<name>-v<version>` tag does not exist yet; an unchanged version is skipped ([ADR 025](/decisions/025-publish-agent-skills-as-versioned-releases)). A pull request that edits a skill and leaves its version alone fails the check, because the alternative is a change that silently never ships.

**The guidebook.** It builds on every pull request that touches `docs/`, and a merge to `main` deploys the built site to GitHub Pages ([ADR 029](/decisions/029-render-the-guidebook-with-vitepress)). The site is served from the repository's own project URL, which is why every link in it resolves from that subpath rather than from a domain root.

## Deploying

Nothing deploys automatically. The dev origin, `campfire.wsj27.scouterna.net`, runs the web image and both services on Kubernetes in Azure, handed over by hand; nothing pulls the published image, and `campfire.wsj27.se` serves a placeholder page rather than Campfire.

The direction is recorded: the back-end services run as containers on Kubernetes in Azure, with the web image behind the same ingress, so production keeps the one-origin rule the local environment already keeps ([ADR 027](/decisions/027-run-the-back-end-on-kubernetes-in-azure), [ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)). `pnpm start:prod` is the shape of it on one machine: it brings up Caddy, the real auth service, the real project API, and the built image serving the web, all on `http://localhost:8000` ([The environments](../development/environments)). That is the production artifact, run where nobody depends on it.

## Reaching a phone

Both shells build and neither ships.

- **Android.** The prod flavor names the production origin and nothing more: it is a debuggable build with no signing configuration. `build_android.yml` proves the shell assembles, and stops there.
- **Apple.** There is no Apple workflow at all, because a build needs macOS with Xcode and no runner is spent on it. The pre-push hook is the whole gate, and it skips out loud where the toolchain is missing.
- **Both.** The three environments share one identity – `se.scouterna.campfire` on both platforms – so they cannot sit on a phone side by side. That is the accepted cost of not maintaining three identities for a difference that is one URL.

Whether the shells reach leaders through the public stores, TestFlight, or managed distribution is undecided ([ADR 010](/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells)), and the answer brings signing, store accounts, a beta track, and a cadence with it. Asking hundreds of leaders to install the application has to be one instruction, which is the force that will decide it. Whatever is chosen is recorded as an ADR and described here once it runs.
