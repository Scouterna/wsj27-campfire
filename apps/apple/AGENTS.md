# Apple shell

Read the [root `AGENTS.md`](../../AGENTS.md) first. This file is what is true only of `apps/apple`, the Swift shell that hosts the web application ([ADR 010](../../docs/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells.md)). What the shells are for is the guidebook's [Applications](../../docs/guidebook/architecture/applications.md) page. Its files and the Android shell's are twins – the root's Comments section says what that asks of them.

The shell is thin by rule. It owns what a webview cannot reach – the tab bar, the native navigation bar, the back gesture, the cookie jar, and the launch surface – and every word a user reads comes from the web, apart from the failure strings in `assets/Localizable.xcstrings`. A screen belongs in [`apps/web`](../web/AGENTS.md).

## Not built yet

The bridge, the tabs, the identity sheet, and theming are the design below, not code. `App.swift` draws one localized word, and `test-ui/` launches the shell and waits for it. Build toward the design rather than around the stub.

## Layout

```text
apps/apple/
├── project.yml          the readable source for the Xcode project
├── Campfire.xcodeproj   generated from it by XcodeGen, and committed
├── assets/              the app icon, the asset catalog, and Localizable.xcstrings
├── config/              the xcconfigs, and the generated plists
├── src/                 the shell's Swift
├── test/                the Swift Testing target, mirroring src/
└── test-ui/             the XCUITest target, driving the real shell
```

- iOS 26 on iPhone only, in Swift 6. `supportedDestinations` and `TARGETED_DEVICE_FAMILY` both say so, and both are needed, or an iPad build ships.
- `LM_SKIP_METADATA_EXTRACTION` is on because no target links AppIntents. It comes off with the first App Intent.

## The project is generated

`project.yml` is the source; `Campfire.xcodeproj` is generated from it and committed, so a fresh clone builds with Xcode alone ([ADR 020](../../docs/decisions/020-generate-the-xcode-project-with-xcodegen.md)).

- **Never hand-edit the project file.** Edit `project.yml` and run `pnpm generate:apple`; the next generation throws a hand edit away.
- A new file under `src/`, `test/`, or `test-ui/` needs no regeneration, because the project lists directories. A new target, scheme, configuration, or build setting does.
- Each environment is a configuration crossed with Debug and Release, and XcodeGen turns them into the **Campfire Local**, **Campfire Dev**, and **Campfire Prod** schemes. The scripts name the scheme they want rather than relying on the selection.

## Schemes are origins

The schemes set one thing, `CAMPFIRE_WEB_ORIGIN`, in `Local.xcconfig`, `Dev.xcconfig`, and `Prod.xcconfig`, each including `Shared.xcconfig`. It reaches the app through the generated `Info.plist` and is read once by `Config.swift`. Nothing else in the app carries an address, and the shell never knows which environment runs behind it ([ADR 012](../../docs/decisions/012-run-campfire-in-three-environments-on-one-origin.md)).

- One bundle identifier across all three, so they replace each other on a device – the accepted cost of one identity.
- `//` starts a comment in an xcconfig, so a URL's `//` is written `/$()/`.
- The local origin is spelled `localhost` – not `127.0.0.1` or a LAN address – because cookies do not cross between spellings of one machine, and ScoutID returns only to the registered host name.
- The version is the shell's own, from the commits that touch `apps/apple/` ([ADR 034](../../docs/decisions/034-version-each-artifact-from-its-own-commits.md)). `Shared.xcconfig` holds `0.0.0` and build `1` as placeholders no release edits; a release passes `CAMPFIRE_VERSION_NUMBER` and `CAMPFIRE_BUILD_NUMBER` to `xcodebuild`.

## The bridge

`web/Bridge.swift` is one half of a versioned contract; the web half is in `libraries/host` and the Kotlin half in `apps/android` ([ADR 018](../../docs/decisions/018-bridge-the-web-application-and-the-shells-with-versioned-messages.md)). The contract and its messages are in [The bridge](../../docs/guidebook/architecture/layers/bridge.md), and what each message means for navigation in [Navigation and routing](../../docs/guidebook/architecture/layers/navigation.md).

- Channel `campfire`, protocol version 1, JSON. A message that does not parse, carries another version, or names an unknown type is dropped, never guessed at.
- Inbound arrives through a `WKScriptMessageHandler`; outbound goes through `evaluateJavaScript`, because a message handler has no reverse channel. The shell never sends before the web has reported.
- The main webview appends a `CampfireShell` token to the User-Agent, which is how [`libraries/host`](../../libraries/host/src/host.ts) knows it is in a shell. The identity webview does not.
- A theme arrives as a name, mapped in `Palette`. An unknown name falls back to blue.
- Sections arrive with a semantic icon name mapped to SF Symbols. An unknown name draws a neutral shape, because the web may lead the shells by a release.
- Signing in cancels the navigation to an identity origin and reopens it in a modal sheet sharing the shell's cookie store, `WKWebsiteDataStore.default()`, so the cookies set on the way back land where the main webview reads them. Returning to the app origin closes the sheet and reloads the page; links out go to the system browser ([ADR 019](../../docs/decisions/019-authenticate-on-the-app-origin-through-scoutid.md), [Sign in](../../docs/guidebook/architecture/example-flows/sign-in.md)).
- A change to the contract changes all three halves at once, with the tests beside each.

## Where the shells differ

Differences chosen on each platform's own terms:

- Every tab is activated on sign-in, so a first switch shows a rendered page. The Android shell builds a tab's webview when it is first shown instead.
- Bravely Script is this shell's alone, for the large title.
- The interactive back swipe stays a manual check, because the edge gesture cannot be synthesized.

## Conventions

- Swift 6 and SwiftUI. A type that crosses an isolation boundary is `Sendable`.
- SwiftFormat formats, from `config/swiftformat/`; SwiftLint checks, from `config/swiftlint/`, with `--strict`, so a warning fails. Reach for `// swiftlint:disable:this` only with the reason beside it.
- Configuration is read once, in `Config.swift`, and nothing else reads `Info.plist`. A missing value is a `fatalError` naming it, because a shell without its origin has nothing to show.
- Strings live in `assets/Localizable.xcstrings`, and a view names a key, never a literal. The source language is Swedish.
- Unit tests are Swift Testing – a `@Suite` per type and a `@Test` named as a sentence in backticks. The unit target is hosted by the app, so `Config` reads the shell's own `Info.plist`.
- UI tests are XCUITest and stay incurious about which words are on screen – those belong to the web application.
- `pnpm start:apple` needs something answering on `http://localhost:8000` – start a stack first. Both test scripts run the Local scheme, and `pnpm test:apple` compiles the UI tests too, which keeps them from rotting.
- `CAMPFIRE_DEVICE=1 sh scripts/apple/build.sh local` builds for a real iPhone against this machine's LAN address. Sign-in cannot complete there, because ScoutID returns only to `localhost`.
- Continuous integration runs no Apple workflow, on purpose, so no macOS runner is spent. The `pre-push` hook is the gate, and only where the toolchain is installed – run the checks yourself.
- Read the [architecture chapter](../../docs/guidebook/architecture/index.md) before a change that moves a boundary.
