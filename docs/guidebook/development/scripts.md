# The scripts

Everything runs through a named root script. Nobody changes into a subdirectory, calls Gradle by hand, or remembers an `xcodebuild` line – the root `package.json` is the one front door, and the native directories stay purely native. `pnpm run` lists the live set, and `package.json` settles any disagreement with this page.

## How the names work

The names follow one grammar: `<verb>:<target>`, and `<verb>:<target>:<flavor>` where a target has variants.

The target of a `start:` script is the size of what it runs. The three environments – `start:local`, `start:dev`, and `start:prod` – each bring up a whole stack on `http://localhost:8000` ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)); every other `start:` script starts one thing, a single server or a shell.

The flavor belongs to `build:`, not to `start:`, and the difference is deliberate. The environment scripts choose which stack answers on this machine, while `build:android:dev` and `build:apple:prod` bake a remote site into an artifact that ships. Running a shell has no flavor at all: `start:android` and `start:apple` always point at this machine.

## Run

| Script            | What it does                                                            |
| ----------------- | ----------------------------------------------------------------------- |
| `start:local`     | The local environment – Caddy, the mock, and Vite                       |
| `start:dev`       | The dev environment – the real back-end in containers                   |
| `start:prod`      | The prod environment – the built image                                  |
| `start:web`       | The web application's Vite dev server alone                             |
| `start:mock`      | The mock back-end alone                                                 |
| `start:guidebook` | This guidebook                                                          |
| `start:storybook` | Storybook – every component, widget, and screen                         |
| `start:arch`      | Structurizr, for arranging the architecture diagrams                    |
| `start:android`   | Builds and runs the Android shell on a device or emulator, against 8000 |
| `start:apple`     | Builds and launches the Apple shell on a simulator, against 8000        |

## Check and test

| Script                 | What it does                                                            |
| ---------------------- | ----------------------------------------------------------------------- |
| `check:format`         | Prettier, in check mode                                                 |
| `check:lint`           | ESLint, failing on any warning                                          |
| `check:markdown`       | markdownlint                                                            |
| `check:types`          | The TypeScript compiler, without output                                 |
| `check:arch`           | Validates the architecture model                                        |
| `check:android:format` | ktlint                                                                  |
| `check:android:lint`   | Detekt and Android Lint                                                 |
| `check:apple:format`   | SwiftFormat, in lint mode                                               |
| `check:apple:lint`     | SwiftLint, strict                                                       |
| `test`                 | The TypeScript unit tests, with coverage                                |
| `test:web:ui`          | The Playwright walks, starting the local stack or reusing a running one |
| `test:android`         | The Android unit tests, and a compile of the instrumented tests         |
| `test:android:ui`      | The Android instrumented tests, on an emulator                          |
| `test:apple`           | The Apple unit tests, on a simulator                                    |
| `test:apple:ui`        | The Apple UI tests, on a simulator                                      |

[The checks](./checks) says which of these run before a push and in continuous integration.

## Fix and generate

| Script           | What it does                                                   |
| ---------------- | -------------------------------------------------------------- |
| `format`         | Prettier, writing fixes                                        |
| `format:android` | ktlint, writing fixes                                          |
| `format:apple`   | SwiftFormat, writing fixes                                     |
| `format:svg`     | svgo, rewriting the SVG icons in place                         |
| `generate:apple` | XcodeGen, regenerating `Campfire.xcodeproj` from `project.yml` |

## Build and release

| Script               | What it does                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `build:web`          | The web application                                                                         |
| `build:image`        | The deployable web image, for linux/amd64                                                   |
| `build:guidebook`    | This guidebook                                                                              |
| `build:storybook`    | Storybook                                                                                   |
| `build:arch`         | Renders the architecture diagrams as SVGs                                                   |
| `build:android:dev`  | The Android shell against the dev site                                                      |
| `build:android:prod` | The Android shell against the prod site                                                     |
| `build:apple:dev`    | The Apple shell against the dev site                                                        |
| `build:apple:prod`   | The Apple shell against the prod site                                                       |
| `version:next`       | Prints the next version of `android`, `apple`, or `web` ([Release](../maintenance/release)) |

## Housekeeping

| Script        | What it does                                                 |
| ------------- | ------------------------------------------------------------ |
| `ide:android` | Opens the Android shell in Android Studio                    |
| `ide:apple`   | Opens the Apple shell in Xcode                               |
| `clean`       | Removes every build output, and Gradle's working directories |
| `prepare`     | Points git at `.githooks`, run by `pnpm install`             |

## The ports

Every server has a port of its own, chosen rather than defaulted, so two can run at once without either taking the other's address.

| Port | What holds it                                                                  |
| ---- | ------------------------------------------------------------------------------ |
| 8000 | The one origin – Caddy on the host in local, a Caddy container in dev and prod |
| 8003 | The mock back-end, reached through Caddy                                       |
| 3000 | The web application's Vite dev server                                          |
| 3001 | This guidebook                                                                 |
| 3002 | Storybook                                                                      |
| 3003 | Structurizr, for the C4 model                                                  |

Each port is strict, so a server that cannot have its port fails instead of quietly moving to the next one and leaving a link wrong. Starting the same server twice is handled the other way: the environment and server scripts free their port first and name whatever held it, so a second `pnpm start:web` replaces the first rather than failing.

## What is behind them

The shell scripts live in `scripts/`, grouped by what they start or build. The Structurizr runner and the version rule behind `pnpm version:next` are Node rather than shell, so they run on any machine, and a missing Docker fails the Structurizr runner with a message that names it.

The start scripts share one set of helpers that make them trustworthy: a port is freed before it is taken, a server is reported only once it actually answers rather than once its process exists, and everything a script started stops together on Ctrl+C or when any one of them dies. Waiting comes in three kinds – any answer, a 2xx, and any status the back-end produced itself rather than a proxy's 502 – because a stack reported as up before it is up costs more than the wait.

Shell scripts are the one kind of source nothing formats. Prettier has no parser for them and no shell formatter is in the toolchain, so they are held to review instead.
