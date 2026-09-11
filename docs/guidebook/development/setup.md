# Setting up

`pnpm install` is the only step for the shared layer – the web application, the checks, the tests, and this guidebook. Everything past that is installed out of band, because it is a standalone tool that pnpm does not manage: Caddy and Docker for the environments, Playwright's browser for the walk-throughs, and the Apple and Android toolchains for the shells. This page is the full list.

The web application needs none of the native tooling. Working on the Apple shell needs a Mac, because iOS only builds on macOS; the Android shell builds anywhere a JDK and the Android SDK do.

## At a glance

| What                       | Why it is needed                                                   | How                                           |
| -------------------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| Node.js 24                 | Runs the web application, the checks, the tests, and the guidebook | Pinned in `.tool-versions`; any installer     |
| Corepack and pnpm          | Corepack activates the pnpm version `package.json` pins            | `corepack enable`, then `pnpm install`        |
| Caddy                      | The front door of the local environment, on port 8000              | `brew install caddy`                          |
| Docker                     | The dev and prod environments, `build:image`, and the C4 diagrams  | Docker Desktop, or another engine             |
| Playwright's Chromium      | The browser the module walk-throughs drive                         | `pnpm exec playwright install chromium`       |
| Xcode                      | Builds, runs, and tests the Apple shell                            | App Store, plus an iOS 26 simulator           |
| XcodeGen                   | Regenerates `Campfire.xcodeproj` after editing `project.yml`       | `brew install xcodegen`                       |
| SwiftFormat, SwiftLint     | The Apple format and lint checks                                   | `brew install swiftformat swiftlint`          |
| Android Studio and the SDK | Builds and runs the Android shell; provides `adb` and the emulator | Android Studio, then the SDK Manager          |
| JDK 25                     | Compiles the Android shell                                         | Android Studio's bundled JBR, or a Temurin 25 |

## Node.js, through whatever pins it

The Node version is pinned in `.tool-versions` at the repository root, and `package.json` sets a floor of 24 in `engines`:

```text
nodejs 24.19.0
```

Nothing in the repository installs Node. Any manager that reads `.tool-versions` – asdf, mise – gives everyone the pinned version, and a hand-installed Node 24 works just as well. It is the only runtime pinned there: Gradle comes from the committed wrapper and the JDK from Android Studio, so neither needs a line.

The number matters in one more place than the developer's machine. `config/environments/prod/Dockerfile` builds on `node:24.19.0-alpine`, the same version spelled out rather than a floating `24-alpine`, so what builds locally and what builds in the deployable image are the same runtime ([ADR 026](/decisions/026-publish-the-web-application-as-a-container-image)).

## pnpm, through Corepack

pnpm is not installed separately. It is pinned by the `packageManager` field in `package.json` at `pnpm@11.15.0` and activated by Corepack, which ships with Node:

```bash
corepack enable         # activates the pnpm version package.json pins
pnpm install            # installs dependencies and points git at .githooks
```

`pnpm install` runs the `prepare` script, which sets `core.hooksPath` to `.githooks` – so the [git hooks](./checks) are wired up by installing, and nobody has to remember a second command ([ADR 008](/decisions/008-check-commits-with-git-hooks)).

Two install policies are worth knowing before adding a dependency, both set in `pnpm-workspace.yaml`. Every version is pinned exactly – `savePrefix` is the empty string, so nothing is ever added as a `^` range – and a release younger than three days refuses to install: `minimumReleaseAge` is 4320 minutes, in strict mode, so a package carrying no publish timestamp is refused too ([ADR 005](/decisions/005-pin-every-dependency-and-let-new-releases-age)). An unmet peer dependency is a failure rather than a warning, which is why `workbox-build` and `workbox-window` sit in the root `devDependencies` with nothing importing either: `vite-plugin-pwa` declares both as required peers.

## Caddy and Docker

Caddy is the front door of the [local environment](./environments). `pnpm start:local` refuses to run without it and says `brew install caddy`. It is the only host-installed piece of that stack.

Docker carries three separate jobs: the dev and prod environments run their containers through Compose, `pnpm build:image` builds the deployable web image, and `pnpm start:arch`, `pnpm build:arch`, and `pnpm check:arch` run Structurizr in a container to serve, render, and validate the C4 model ([ADR 030](/decisions/030-model-the-architecture-as-c4-in-structurizr)). Docker Desktop is the tested engine. None of it is needed to work on the web application against the local stack.

## Playwright's browser

`pnpm test:web:ui` drives the real application in a real browser, and the browser is not part of `pnpm install`. Download it once:

```bash
pnpm exec playwright install chromium
```

Chromium alone, because that is all `config/playwright/playwright.config.ts` asks for. The suite starts the Vite dev server itself and reuses one that is already running, so nothing else has to be up first.

## The Apple toolchain

- **Xcode**, from the App Store, with the command-line tools selected and at least one iOS 26 simulator installed – `project.yml` sets the deployment target at iOS 26.0. A fresh clone builds and runs with Xcode alone, because `Campfire.xcodeproj` is committed ([ADR 020](/decisions/020-generate-the-xcode-project-with-xcodegen)).
- **XcodeGen** (`brew install xcodegen`) is needed only to regenerate the project after editing `project.yml`, not to build one. `project.yml` sets `minimumXcodeGenVersion: 2.46.0`, so an older XcodeGen refuses rather than generating something subtly different.
- **SwiftFormat and SwiftLint** (`brew install swiftformat swiftlint`) run the Apple format and lint checks. Their versions are not pinned – they are installed out of band, and the `pre-push` hook skips a check whose tool is absent rather than failing on it.

`scripts/apple/simulator.sh` resolves which simulator to use rather than naming one: `CAMPFIRE_SIMULATOR` if it is set, then an iPhone that is already booted, then an iPhone on the newest installed iOS runtime that has one. Only iPhones on an iOS runtime are candidates, so a booted Apple Watch or Apple TV is passed over rather than named to `xcodebuild`, and a machine with a different set of runtimes needs no configuration.

## The Android toolchain

- **Android Studio**, which brings the **Android SDK**, `adb`, and the emulator. Through the SDK Manager, install the platform for API 37 (`compileSdk`) and current build tools; the shell targets API 36 and its floor is API 30.
- **A JDK 25.** `apps/android/gradle/gradle-daemon-jvm.properties` pins `toolchainVersion=25` – the runtime Android Studio bundles, so the IDE and the command line build on the same JDK and nobody installs a second one.
- **Nothing else.** Gradle comes from the committed wrapper, which pins 9.7.1, and ktlint and Detekt are Gradle plugins rather than binaries on the machine – pinned in `apps/android/build.gradle.kts` at 14.2.0 and 2.0.0-alpha.6, with ktlint itself held at 1.8.0 there and in the app module's `apps/android/config/app/build.gradle.kts`, because the root project applies ktlint too so that `ktlintCheck` covers the two Gradle scripts Prettier leaves to it. That is what lets the Android checks run on a continuous integration runner with only a JDK.

Gradle finds the SDK the way it always does: `sdk.dir` in `apps/android/local.properties` – gitignored, so it is a per-machine file – then `ANDROID_HOME`, then `ANDROID_SDK_ROOT`. The `pre-push` hook asks the same three questions in the same order before deciding whether to run the Kotlin checks.

`adb` and `emulator` have to be on the PATH for `pnpm start:android`; they live under `$ANDROID_HOME/platform-tools` and `$ANDROID_HOME/emulator`. Like the simulator, the virtual device is resolved rather than named – `CAMPFIRE_AVD` if it is set, otherwise the first AVD the machine has.

## The first run

From a fresh clone:

```bash
corepack enable
pnpm install            # dependencies, and the git hooks
pnpm start:local        # the whole system at http://localhost:8000
```

From there, `pnpm start:guidebook` opens this guidebook on port 3001 and `pnpm start:storybook` opens the component catalog on 3002.

Before handing work back, run the [checks](./checks). A native check whose tool is missing is skipped rather than failed, so the shared checks always run and the native ones run on a machine set up for that platform.
