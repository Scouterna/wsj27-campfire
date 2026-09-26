# Release

Campfire releases three things: the web image, the Android shell, and the Apple shell. The web changes often and must reach phones in minutes, while a shell changes rarely and waits on a store review, so each has its own version and its own way out ([ADR 010](/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells)).

## Versioning

Each artifact has a CalVer version, `YEAR.FEATURE.PATCH`, kept in a git tag – `web-v`, `android-v`, or `apple-v` followed by the version ([ADR 034](/decisions/034-version-each-artifact-from-its-own-commits)). The tag is the source of truth, and nothing in the tree carries a version.

The next version is worked out from the commits since the artifact's last tag that touch its paths – for the web, the paths that trigger its release workflow; for a shell, its own directory. A commit that touches several artifacts counts toward each. Its type decides how far the version moves:

| Commits since the last tag       | Next version                                        |
| -------------------------------- | --------------------------------------------------- |
| Any `feat`, or any type with `!` | Feature segment up and patch reset to 0             |
| Otherwise, any `fix` or `revert` | Patch segment up                                    |
| Anything else                    | No version – `docs`, `refactor`, `chore`, and so on |

Several commits earn one version, the largest bump among them. A feature bump in a new year starts over at `<year>.1.0`, a patch stays on its version's year, and an artifact with no tag starts at `<year>.1.0`. The history is what the rule reads, which is why commits follow Conventional Commits without a scope and the history is kept linear by rebasing.

The rule is written once, tested on every pull request, and runnable locally. It reads the tags and the history, so it needs a full clone:

```sh
pnpm version:next web
```

The three numbers drift apart on purpose, because they name three binaries rather than one release. A newer web inside an older shell is the bridge working as designed, and the bridge's protocol version is a separate number again ([ADR 018](/decisions/018-bridge-the-web-application-and-the-shells-with-versioned-messages)). Wherever a person sees a version, the artifact is named beside it.

### The version in a build

The tree says `0.0.0` everywhere – in every `package.json`, the Apple xcconfig, and the Android build script. A release passes the real version into the build, and a build given nothing, such as `pnpm build:web` or a run from Xcode or Android Studio, is `0.0.0`. No build reads git to claim otherwise. A web build carries its version in a `campfire-version` meta tag in the page head, so the version a browser is running can be read from the page.

## What a merge publishes

Each release is a small GitHub Actions workflow that runs on a merge to `main` touching its paths, and can also be started by hand to retry a failure ([ADR 009](/decisions/009-check-and-release-with-small-github-actions-workflows)). Releases queue rather than race, and one in flight is never canceled, because a canceled release can leave a tag without the thing it names.

| What          | Publishes to                                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| The web image | The GitHub Container Registry, as `ghcr.io/scouterna/wsj27-campfire` ([ADR 026](/decisions/026-publish-the-web-application-as-a-container-image)) |
| The skills    | A GitHub Release per skill whose version changed ([ADR 025](/decisions/025-publish-agent-skills-as-versioned-releases))                           |
| The guidebook | GitHub Pages ([ADR 029](/decisions/029-render-the-guidebook-with-vitepress))                                                                      |

**The web image.** Every merge that touches the web publishes `:main`, a moving pointer, and `:sha-<short>`, a fixed one for that commit. A merge that earns a version builds the image with that version, publishes `:<version>` as well, and only then creates the `web-v` tag, so a tag never names an image that failed to publish. A failed release is retried by running it again, and it works out the same version, because the failed run created no tag. The image is built for amd64 only, the cluster's platform.

**The skills.** A skill is released when no tag exists for its version, and an unchanged version is skipped. A pull request that edits a skill without bumping its version fails its check, because that change would otherwise never ship.

**The guidebook.** A merge that touches the docs builds the site and deploys it to GitHub Pages, under the repository's project path.

## Dev and prod

Two tags on the web image say what each environment runs, and nothing else moves ([ADR 035](/decisions/035-promote-the-web-by-moving-environment-tags)):

- **`:dev` follows every release.** Once a version is tagged, `:dev` moves to that image, so what the contingent management team tests at `campfire.wsj27.scouterna.net` is exactly what could be promoted. A merge that earns no version moves nothing.
- **`:prod` moves only by promotion.** A maintainer names a released version, and the promotion points `:prod` at that version's image. Nothing is rebuilt, so prod runs byte for byte the image dev ran.

Promotion is started from the Actions tab or the command line:

```sh
gh workflow run promote_web.yml -f version=2026.9.0
```

A version that is not CalVer-shaped, has no tag, or has no image is refused, and prod stays where it was. Rolling back is promoting an earlier version – there is no other way to move `:prod`. There is no `:latest`, because nothing should run whatever happened to be published last.

Every move of `:dev` and every promotion, refused ones included, is a deployment on the repository's Deployments page, linking to the site it changed: who started it, which version, and how it ended. That page, not the git history, is the record of what each environment has run. A promotion's run summary also names the version it replaced and the command that goes back to it.

Moving a tag restarts nothing. The web runs on Scouterna's Kubernetes cluster in Azure, behind the same ingress as the back-end services, and the people who operate the cluster pick up what a tag points at through a step on their side – for prod, a step taken by hand. GitHub therefore holds no credentials for the cluster ([ADR 027](/decisions/027-run-the-web-beside-the-back-end-on-scouternas-cluster)). `pnpm start:prod` is the same shape on one machine: the built image behind one origin with the real back-end ([Environments](../development/environments)).

## The shells

A shell is released by hand, one platform at a time, and neither touches the other's version. The release works out that platform's version from the shell's own commits and stops when there is none, takes its build number from the release run, and creates the tag last. A failed release is retried as a new run, so a store never sees the same build number twice ([ADR 034](/decisions/034-version-each-artifact-from-its-own-commits)).

Two decisions stand between that and a phone, and both are open:

- **Signing and store upload from continuous integration.** The shells build – the Android shell on every pull request, the Apple shell on a developer's Mac, since no runner is spent on Xcode – but neither build is signed.
- **How leaders install Campfire.** Public stores, TestFlight, or managed distribution each bring their own accounts, beta track, and cadence. Whatever is chosen has to keep installing to one instruction, "search for Campfire in the store", because hundreds of leaders will follow it ([ADR 010](/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells)).

The three environments share one app identity on each platform, so a dev build and a prod build cannot sit on a phone side by side. That is the accepted cost of not keeping three identities for a difference that is one URL.
