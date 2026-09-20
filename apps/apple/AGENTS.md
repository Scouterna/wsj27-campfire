# Apple

Read the [root `AGENTS.md`](../../AGENTS.md) first – it holds the conventions that apply everywhere. This file is what is true only of Swift, which lives in `apps/apple` and nowhere else. What the shells are for is [ADR 010](../../docs/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells.md) and the guidebook's [Applications](../../docs/guidebook/architecture/applications.md) page.

The shell is thin by rule. Every word a user reads comes from the web application – the only exceptions are the tab labels the web itself supplies over the bridge and the failure strings in `assets/Localizable.xcstrings`. Today that catalog holds only the app name, the one word the screen shows. A shell owns what a webview cannot reach: the tab bar, the native navigation bar, the back gesture, the cookie jar, and the launch surface. If you are about to write a screen here, the screen belongs in [`apps/web`](../web/AGENTS.md).

## Layout

```text
apps/apple/
├── project.yml          the readable source for the Xcode project
├── Campfire.xcodeproj   generated from it by XcodeGen, and committed
├── assets/              the app icon, the asset catalog, and Localizable.xcstrings
├── config/              Shared, Local, Dev, and Prod xcconfigs, and the generated plists
├── src/                 App.swift and Config.swift
├── test/                the Swift Testing target
└── test-ui/             the XCUITest target, driving the real shell
```

iOS alone, on iOS 26, iPhone alone, Swift 6 – `supportedDestinations` bounds the platform and `TARGETED_DEVICE_FAMILY` the device, and both are needed.

The shell is a project shape, not yet a shell. `src/` holds two files: `App.swift`, whose whole body is one localized `Text`, and `Config.swift`, which reads the origin. The source layout to build into is flat beside them – an app model holding the session, a section vocabulary, a `routes/` directory for the gate and the skeleton, a `theme/` for the palette, and a `web/` for the bridge, the tabs, and the identity flow. Tests mirror `src/`.

## The Xcode project is generated

`project.yml` is the readable source; `Campfire.xcodeproj` is generated from it by XcodeGen and committed, so a fresh clone builds with Xcode alone ([ADR 020](../../docs/decisions/020-generate-the-xcode-project-with-xcodegen.md)).

- **Never hand-edit the project file.** Edit `project.yml` and run `pnpm generate:apple` – the next generation throws a hand edit away, and Prettier is told to ignore both the project bundle and `config/generated/`.
- Adding a file under `src/`, `test/`, or `test-ui/` needs no regeneration, because the project lists the directories rather than the files. Adding a target, a scheme, a configuration, or a build setting does.
- `configs` declares six configurations – `Local`, `Dev`, and `Prod`, each Debug and Release – and XcodeGen's `configVariants` turn them into three schemes, **Campfire Local**, **Campfire Dev**, and **Campfire Prod**. Prod leads the variant list so a fresh checkout opens on it; the scripts name the scheme they want and never rely on the selection.

## Schemes and configuration

Xcode's own Debug and Release are gone: a configuration here is an environment crossed with a build type.

The three environments differ in one setting, `CAMPFIRE_WEB_ORIGIN`: `localhost:8000` for Local, `campfire.wsj27.scouterna.net` for Dev, and `campfire.wsj27.se` for Prod. Settings live in `config/Shared.xcconfig` – the CalVer version, the build number, the bundle identifier, the app name, and the signing team – with `Local.xcconfig`, `Dev.xcconfig`, and `Prod.xcconfig` including it and adding the origin. They reach the app through a `Campfire` dictionary in the generated `Info.plist` and are read by `src/Config.swift`, which stops launch on a missing or malformed value – nothing else in the app carries a URL. A `//` starts a comment in xcconfig, so a URL's `//` is written `/$()/` to break the token.

One bundle identifier, `se.scouterna.campfire`, across all three, so they cannot sit on a phone side by side – the accepted cost of not maintaining three identities for a difference that is one URL. The shell never knows which environment is running; the environment is a property of the stack behind the origin ([ADR 012](../../docs/decisions/012-run-campfire-in-three-environments-on-one-origin.md), [The environments](../../docs/guidebook/development/environments.md)).

## The bridge

`web/Bridge.swift` is to be one half of a versioned contract; the web half lives in `libraries/host` and the Kotlin half in `apps/android/src/se/scouterna/campfire/web/Bridge.kt` ([ADR 018](../../docs/decisions/018-bridge-the-web-application-and-the-shells-with-versioned-messages.md)).

- Channel name `campfire`, protocol version 1, JSON. A message that cannot be parsed, carries another version, or names an unknown type is dropped, never guessed at.
- Inbound arrives through a `WKScriptMessageHandler`; outbound goes back through `evaluateJavaScript`, because a script message handler has no reverse channel. The shell never sends before the web has reported.
- The main webview appends a `CampfireShell` token to the User-Agent, which is how [`libraries/host`](../../libraries/host/src/host.ts) knows a shell is there at all. The identity webview deliberately does not.
- The theme arrives as a name, never a color. Map it in `Palette`; an unknown name degrades to the default blue rather than failing.
- Sections arrive in the session message as id, label, path, and a semantic icon name mapped to SF Symbols. A name the shell does not know yet draws a neutral shape, because the web composition may lead the shells by a release.
- A change to the contract is a change in all three places at once, with the tests beside each.

There is no channel in this tree, on either side. `libraries/host` detects the tier and carries no messages, and the shell has no webview to talk to. The message table is in [Applications](../../docs/guidebook/architecture/applications.md), and what each shell message means for navigation is in [Navigation and routing](../../docs/guidebook/architecture/layers/navigation.md).

## Identity, and the cookie jar

None of this section is in the tree yet – the sheet, the shared jar, and the links out all arrive with the bridge. It is the flow to build to, written down before it is built.

A navigation to a configured identity origin is canceled and reopened as a modal `IdentityFlow` sheet sharing `WKWebsiteDataStore.default()`. That shared jar is the entire point: the cookies the auth service sets on the way back land where the main webview reads them ([ADR 019](../../docs/decisions/019-authenticate-on-the-app-origin-through-scoutid.md)). When the round trip returns to an ordinary app-origin URL the sheet closes and the page underneath reloads. Links out of the flow – terms, help – go to the system browser. [Sign in](../../docs/guidebook/architecture/example-flows/sign-in.md) walks the whole trip.

Cookies live on `localhost` specifically – not `127.0.0.1`, not a LAN address. A session's cookies do not cross between spellings of the same machine, and ScoutID only returns to the one registered host name. That is why `Local.xcconfig` spells the origin `localhost`.

## Commands

| Command                                             | What it does                                           |
| --------------------------------------------------- | ------------------------------------------------------ |
| `pnpm start:apple`                                  | Boots a Simulator and launches the shell against :8000 |
| `pnpm build:apple:dev` / `pnpm build:apple:prod`    | Build only, against the deployed dev or prod origin    |
| `pnpm generate:apple`                               | Regenerate `Campfire.xcodeproj` from `project.yml`     |
| `pnpm ide:apple`                                    | Open the project in Xcode                              |
| `pnpm check:apple:format` / `pnpm check:apple:lint` | SwiftFormat in lint mode; SwiftLint with `--strict`    |
| `pnpm format:apple`                                 | SwiftFormat, writing fixes                             |
| `pnpm test:apple` / `pnpm test:apple:ui`            | The unit tests; the UI tests, both on a Simulator      |

`start:apple` refuses to run unless something answers on `http://localhost:8000`, so start a stack first – `pnpm start:local`, `start:dev`, or `start:prod`. Both test scripts always run the Local scheme: the unit tests expect the Local origin, `http` on `localhost`, and the walk-through needs no stack today – it will once the shell loads the web.

To run the shell on a real iPhone, build with `CAMPFIRE_DEVICE=1 sh scripts/apple/build.sh local`. It builds a signed device build pointed at this machine's LAN address on port 8000, read from `en0` at build time, so the phone reaches the local stack – but sign-in cannot complete there, because ScoutID only sends the flow back to `localhost`.

`xcodebuild` builds every test target in the scheme whichever one is selected, so `pnpm test:apple` also compiles the walk-through – which is what keeps that suite from rotting between the occasions anybody runs it.

There is no Apple workflow in continuous integration, on purpose: no macOS runner is spent. The `pre-push` hook is the whole gate, and it runs these checks only when the toolchain is installed – a missing toolchain is skipped out loud. Run them yourself.

## Conventions

- Swift 6 and SwiftUI. A type that crosses an isolation boundary is `Sendable`.
- Formatting is SwiftFormat's (`config/swiftformat/`): two-space indent, `case` indented inside `switch`, 100 columns, trailing commas, no explicit `self`, `@testable` imports at the bottom. Rules are SwiftLint's (`config/swiftlint/`), run `--strict` over `src`, `test`, and `test-ui`, so a warning fails: a file under 400 lines, a type body under 250, a function body under 60, a cyclomatic complexity under 10, two levels of type nesting, 100 columns. Run the formatter rather than aligning anything by hand, and reach for `// swiftlint:disable:this` only with the reason beside it.
- Configuration is read once, in `Config.swift`, and nothing else in the app reads `Info.plist`. A missing value is a `fatalError` naming what is missing, because a shell that cannot find its origin has nothing to show.
- Strings live in `assets/Localizable.xcstrings` and a view names a key, never a literal. `CFBundleDevelopmentRegion` is `sv`, the catalog's source language is Swedish, and Swedish is what a user reads.
- Tests are Swift Testing – a `@Suite("what it is")` per type, a `@Test` whose function name is a sentence in backticks, `#expect` – in `test/`, mirroring `src/`. The unit target is hosted by the app, so `Config` reads the same `Info.plist` the shell reads.
- The UI tests in `test-ui/` are XCUITest, driving the real shell. Today they launch it and wait for the one word it draws; they grow into the walk-through when the first web screens arrive ([UI tests](../../docs/guidebook/testing/ui.md)). Beyond that one word they stay incurious about which words are on screen – those belong to the web application.
- A change here passes `pnpm check:apple:format`, `pnpm check:apple:lint`, and `pnpm test:apple` before it is handed back.
- Read the [architecture chapter](../../docs/guidebook/architecture/index.md) before a change that moves a boundary. It describes the first version as built, so read the code beside it for what exists.

## Things to keep straight

- Deployment target iOS 26, iPhone only. `supportedDestinations` and `TARGETED_DEVICE_FAMILY` both say so, and both are needed or an iPad build ships. iPadOS, macOS, watchOS, tvOS, and visionOS are out of scope.
- `LM_SKIP_METADATA_EXTRACTION` is on because no target links AppIntents. It comes back the day an App Intent is added.
- The version is CalVer, `2026.7.2`, the same string the root `package.json` and the Android `versionName` carry, so one release reads the same everywhere. Bump it in `Shared.xcconfig`, which is why that file exists.
- The next two bullets describe no code in this tree – the tabs and the display face both arrive with the bridge – but they are the contract the two shells are built to, so they are written down before either is built.
- Activating every tab on sign-in, so first switches show rendered pages, is to be an Apple-side choice. Android builds a tab's webview when it is first shown – that is a difference chosen on each platform's terms, not drift.
- Bravely Script is to be the Apple shell's alone, for the large title, and the Android shell is to have no counterpart. Today the face is bundled by neither: it lives in `libraries/ui` as a web font. Each shell holds the tonal blue behind its launch screen, and draws its one screen in white or black to follow the system appearance.
- The interactive back swipe stays a manual check whatever else lands. The edge gesture cannot be synthesized.
