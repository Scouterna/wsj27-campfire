# The scripts

Everything is a named root script. There is no `cd` into a subdirectory, no `gradlew` invoked by hand, and no `xcodebuild` line anyone has to remember – the root `package.json` is the one front door, and the native directories stay purely native. `pnpm run` lists the live set.

The names follow one grammar: `<verb>:<target>` and, where a target has variants, `<verb>:<target>:<flavor>`.

| Kind            | Examples                                                                             |
| --------------- | ------------------------------------------------------------------------------------ |
| Run a stack     | `pnpm start:local`, `pnpm start:dev`, `pnpm start:prod`                              |
| Run a shell     | `pnpm start:android`, `pnpm start:apple`                                             |
| Run one server  | `pnpm start:web`, `pnpm start:guidebook`, `pnpm start:storybook`, `pnpm start:arch`  |
| Build an output | `pnpm build:web`, `pnpm build:image`, `pnpm build:guidebook`, `pnpm build:apple:dev` |
| Check a change  | `pnpm check:format`, `pnpm check:types`, `pnpm check:apple:lint`                     |
| Test            | `pnpm test`, `pnpm test:web:ui`, `pnpm test:android`, `pnpm test:apple:ui`           |
| Regenerate      | `pnpm generate:apple` (after editing `project.yml`), `pnpm format:svg`               |
| Open an IDE     | `pnpm ide:apple`, `pnpm ide:android`                                                 |

## Every script

| Script                      | What it does                                                           |
| --------------------------- | ---------------------------------------------------------------------- |
| `pnpm build:android:dev`    | Assembles the Android shell against campfire.wsj27.scouterna.net       |
| `pnpm build:android:prod`   | Assembles the Android shell against campfire.wsj27.se                  |
| `pnpm build:apple:dev`      | Builds the Apple shell against campfire.wsj27.scouterna.net            |
| `pnpm build:apple:prod`     | Builds the Apple shell against campfire.wsj27.se                       |
| `pnpm build:arch`           | Exports the architecture diagrams as SVGs                              |
| `pnpm build:guidebook`      | Builds the guidebook into `.build/docs`                                |
| `pnpm build:image`          | Packages the built web application as a linux/amd64 Caddy image        |
| `pnpm build:storybook`      | Builds Storybook into `.build/storybook`                               |
| `pnpm build:web`            | Builds the web application into `apps/web/.build`                      |
| `pnpm check:android:format` | ktlint, in check mode                                                  |
| `pnpm check:android:lint`   | Detekt and Android Lint                                                |
| `pnpm check:apple:format`   | SwiftFormat, in lint mode                                              |
| `pnpm check:apple:lint`     | SwiftLint, with `--strict`                                             |
| `pnpm check:arch`           | Validates and inspects the architecture model                          |
| `pnpm check:format`         | Prettier, in check mode                                                |
| `pnpm check:lint`           | ESLint, with `--max-warnings 0`                                        |
| `pnpm check:markdown`       | markdownlint                                                           |
| `pnpm check:types`          | `tsc --noEmit`                                                         |
| `pnpm clean`                | Removes every `.build`, and Gradle's working directories               |
| `pnpm format`               | Prettier, writing fixes                                                |
| `pnpm format:android`       | ktlint, writing fixes                                                  |
| `pnpm format:apple`         | SwiftFormat, writing fixes                                             |
| `pnpm format:svg`           | svgo, rewriting the web and guidebook icons in place                   |
| `pnpm generate:apple`       | XcodeGen, regenerating `Campfire.xcodeproj` from `project.yml`         |
| `pnpm ide:android`          | Opens `apps/android` in Android Studio                                 |
| `pnpm ide:apple`            | Opens `Campfire.xcodeproj` in Xcode                                    |
| `pnpm prepare`              | Points git at `.githooks` – runs as part of `pnpm install`             |
| `pnpm start:android`        | Boots an emulator and launches the Android shell against :8000         |
| `pnpm start:apple`          | Boots a Simulator and launches the Apple shell against :8000           |
| `pnpm start:arch`           | Structurizr, to arrange the diagrams, on port 3003                     |
| `pnpm start:dev`            | The dev environment: the real back-end in containers, on :8000         |
| `pnpm start:guidebook`      | The guidebook's dev server, on port 3001                               |
| `pnpm start:local`          | The local environment: the mock back-end, on :8000                     |
| `pnpm start:mock`           | The mock back-end alone, on port 8003                                  |
| `pnpm start:prod`           | The prod environment: the built image, on :8000                        |
| `pnpm start:storybook`      | Storybook – every component, widget, and screen – on port 3002         |
| `pnpm start:web`            | The web application's dev server alone, on port 3000                   |
| `pnpm test`                 | The TypeScript tests, across every package that has them               |
| `pnpm test:android`         | The Android JVM unit tests, plus the instrumented compile              |
| `pnpm test:android:ui`      | The Android instrumented tests, on an emulator                         |
| `pnpm test:apple`           | The Apple unit tests, on a Simulator                                   |
| `pnpm test:apple:ui`        | The Apple UI tests, on a Simulator                                     |
| `pnpm test:web:ui`          | The Playwright walks – starts a dev server, or reuses a running one    |
| `pnpm version:next`         | The next version an artifact would earn – `android`, `apple`, or `web` |

The same table is in `AGENTS.md`, because the agents work off it. The two are kept in step by hand, and `package.json` settles any disagreement.

## `start:` runs something – the target says how much

The target is the size of the thing. `start:local` runs Caddy, the mock, and Vite together and checks the result through the front door before it says the stack is up; `start:web` runs the Vite dev server and nothing else. The three environment targets – `local`, `dev`, and `prod` – each bring up a whole stack on `localhost:8000` ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)); every other target starts one thing, a single server or a shell.

The flavor suffix belongs to `build:`, not to `start:`, and the difference is the point. `start:local`, `start:dev`, and `start:prod` choose which stack runs on `localhost:8000`. `build:android:dev` and `build:apple:prod` bake a remote origin into a shipped artifact. Running a shell has no flavor at all: `start:android` always points at this machine.

## The ports are chosen, not defaulted

| Port | What holds it                                                               |
| ---- | --------------------------------------------------------------------------- |
| 8000 | The one origin – host Caddy in local, the ingress container in dev and prod |
| 8003 | The mock back-end, reached only through Caddy                               |
| 3000 | The web application's Vite dev server                                       |
| 3001 | This guidebook                                                              |
| 3002 | Storybook                                                                   |
| 3003 | The Structurizr viewer for the C4 model                                     |

Every one of them is pinned and strict – `strictPort` for Vite and VitePress, `--exact-port` for Storybook – so a server that cannot have its port says so instead of quietly moving to the next one and leaving a link in the documentation wrong. Nothing uses Vite's default 5173, deliberately.

Two servers can therefore run at once without either stealing the other's address. Running the same one twice is handled the other way: `scripts/start/server.sh` frees the port first and names whatever held it, so a second `pnpm start:web` replaces the first rather than failing.

## What is behind them

The shell scripts live in `scripts/`, with the shells' own under `scripts/android/` and `scripts/apple/`, the Structurizr runner under `scripts/structurizr/`, and the version rule behind `pnpm version:next` under `scripts/release/`. The last two are Node rather than shell, so they run on any machine – and a missing Docker fails the Structurizr runner with a message that names it.

`scripts/start/helpers.sh` is sourced by the rest and never run on its own. It holds the parts that make a script trustworthy: freeing a port and naming its previous holder, waiting until a server actually answers rather than until a process exists, supervising a set of processes so any one dying stops them all, and exiting cleanly on Ctrl+C. Three kinds of waiting are separate on purpose – any answer at all, a 2xx, and any status the back-end itself produced rather than a proxy's 502 – because a stack reported as up before it is up costs more than the wait.

Shell scripts are the one thing Prettier does not format. `config/prettier/prettier.ignore` lists `*.sh` on purpose: they are held to review rather than to a formatter, because no formatter in the toolchain knows POSIX shell well enough to be trusted with them.
