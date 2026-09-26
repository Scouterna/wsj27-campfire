# Setting up

`pnpm install` is the only step for the shared layer – the web application, the checks, the tests, and this guidebook. Everything else is a standalone tool pnpm does not manage, installed by hand for the work that needs it: Caddy and Docker for the environments, Playwright's browser for the walk-throughs, and the Apple and Android toolchains for the shells.

The web application needs none of the native tooling. The Apple shell needs a Mac, because iOS builds only on macOS; the Android shell builds anywhere a JDK and the Android SDK run.

## The first run

From a fresh clone:

```bash
corepack enable
pnpm install            # dependencies, and the git hooks
pnpm start:local        # the whole system at http://localhost:8000
```

From there, `pnpm start:guidebook` serves this guidebook on port 3001 and `pnpm start:storybook` the component catalog on 3002. Before handing work back, run the [checks](./checks).

## The shared toolchain

Node is pinned in `.tool-versions`, so asdf or mise installs the right version, and a hand-installed Node 24 works just as well. The deployable image builds on the same version, spelled out rather than floating, so what builds locally and what builds for release run on one runtime ([ADR 026](/decisions/026-publish-the-web-application-as-a-container-image)). pnpm is not installed separately – `packageManager` in `package.json` pins it, and Corepack, which ships with Node, activates it.

`pnpm install` also points git at `.githooks`, so the [hooks](./checks) are wired up by installing and nobody has to remember a second command ([ADR 008](/decisions/008-check-commits-with-git-hooks)).

Two install policies matter before adding a dependency ([ADR 005](/decisions/005-pin-every-dependency-and-let-new-releases-age)). Every version is pinned exactly, and a release younger than three days is refused, so a version published this week may simply not install. An unmet peer dependency fails the install rather than warning, which is why a few packages sit in the root `devDependencies` with nothing importing them – another package declares them as required peers.

| Tool                  | Needed for                                                                   | Install                                 |
| --------------------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| Caddy                 | The front door of the local environment, on port 8000, and the walk-throughs | `brew install caddy`                    |
| Docker                | The dev and prod environments, the deployable image, and the C4 diagrams     | Docker Desktop                          |
| Playwright's Chromium | `pnpm test:web:ui`                                                           | `pnpm exec playwright install chromium` |

Caddy is the only host-installed piece of the local stack, and `pnpm start:local` refuses to run without it. The walk-throughs start the same stack themselves, or reuse one that is already running, so they need Caddy too. Docker carries three separate jobs: the dev and prod environments run their containers through Compose, `pnpm build:image` builds the deployable image, and the architecture scripts run Structurizr in a container to serve, render, and validate the C4 model ([ADR 030](/decisions/030-model-the-architecture-as-c4-in-structurizr)). None of it is needed to work on the web application against the local stack.

## The Apple shell

| Tool                   | Needed for                                           | Install                              |
| ---------------------- | ---------------------------------------------------- | ------------------------------------ |
| Xcode                  | Building, running, and testing the shell             | App Store, with an iOS 26 simulator  |
| XcodeGen               | Regenerating the project after editing `project.yml` | `brew install xcodegen`              |
| SwiftFormat, SwiftLint | The Apple format and lint checks                     | `brew install swiftformat swiftlint` |

The shell's deployment target is iOS 26, so at least one iOS 26 simulator has to be installed. `Campfire.xcodeproj` is committed, so a fresh clone builds with Xcode alone, and XcodeGen is needed only after editing `project.yml` ([ADR 020](/decisions/020-generate-the-xcode-project-with-xcodegen)). SwiftFormat and SwiftLint are not pinned, because they are installed out of band.

The scripts choose a simulator rather than naming one: the one `CAMPFIRE_SIMULATOR` names if it is set, then an iPhone that is already booted, then an iPhone on the newest installed iOS runtime. A machine with a different set of runtimes therefore needs no configuration.

## The Android shell

Install Android Studio, and through its SDK Manager the platform for API 37, which the shell compiles against. Android Studio bundles the JDK 25 that Gradle is pinned to, so the IDE and the command line build on the same JDK and nobody installs a second one. Nothing else is installed: Gradle comes from the committed wrapper, and ktlint and Detekt are Gradle plugins pinned in the build rather than binaries on the machine.

Gradle finds the SDK through `sdk.dir` in the gitignored `apps/android/local.properties`, then `ANDROID_HOME`, then `ANDROID_SDK_ROOT`, and the `pre-push` hook asks the same questions in the same order. `pnpm start:android` also needs `adb` and `emulator` on the PATH. It uses a device that is already attached, and otherwise boots the virtual device `CAMPFIRE_AVD` names, or the first one the machine has.

## A missing toolchain

The `pre-push` hook skips the [checks](./checks) of a platform whose toolchain is missing and says so, so the shared checks always run, the native ones run on a machine set up for that platform, and a machine set up only for the web application still pushes.
