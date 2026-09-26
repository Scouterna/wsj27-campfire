# Android shell

Read the [root `AGENTS.md`](../../AGENTS.md) first. This file is what is true only of `apps/android`, the Kotlin shell that hosts the web application ([ADR 010](../../docs/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells.md)). What the shells are for is the guidebook's [Applications](../../docs/guidebook/architecture/applications.md) page. Its files and the Apple shell's are twins – the root's Comments section says what that asks of them.

The shell is thin by rule. It owns what a webview cannot reach – the tab bar, the top bar, predictive back, the cookie jar, and the launch surface – and every word a user reads comes from the web, apart from the failure strings in `assets/values/strings.xml`. A screen belongs in [`apps/web`](../web/AGENTS.md).

## Not built yet

The bridge, the tabs, the identity sheet, and theming are the design below, not code. `MainActivity.kt` draws one centered word, and `test-ui/` holds a launch-only test that proves the activity reaches `RESUMED`. Build toward the design rather than around the stub.

## Layout

```text
apps/android/
├── settings.gradle.kts        includes :app and points it at config/app
├── build.gradle.kts           the plugin versions, ktlint for the root scripts, and output redirected to .build/
├── config/                    AndroidManifest.xml, and app/build.gradle.kts
├── assets/                    the res directory
├── src/se/scouterna/campfire/ the shell's Kotlin
├── test/                      the JUnit 5 unit tests, mirroring src/
└── test-ui/                   the instrumented tests, driving the real shell
```

- One module, `:app`, whose project directory is `config/app`. A build file under `src/` would land inside the Kotlin source set and fail to compile.
- `config/app/build.gradle.kts` remaps the source sets, so there is no `src/main/kotlin` and no `src/main/res`.
- Build output goes to `.build/`. Gradle still writes the root project's problems report to `build/`, which is why git and Prettier ignore that directory separately.
- The package is `se.scouterna.campfire`, on JDK 21 bytecode; the SDK levels are in `config/app/build.gradle.kts`.

## Flavors are origins

The `local`, `dev`, and `prod` flavors set one thing, `CAMPFIRE_WEB_ORIGIN`, read once by `Config.kt`. Nothing else in the app carries an address, and the shell never knows which environment runs behind it ([ADR 012](../../docs/decisions/012-run-campfire-in-three-environments-on-one-origin.md)).

- One `applicationId` across all three, so they replace each other on a device – the accepted cost of one identity.
- `local` is the default, so `assemble` and the IDE's run button mean what `pnpm start:android` means.
- The local flavor reaches the host through the `adb reverse` tunnel `scripts/android/start.sh` opens, never the emulator's `10.0.2.2` alias. Cookies do not cross between spellings of one machine, and ScoutID returns only to the registered host name.
- `assets/xml/network_security_config.xml` permits cleartext for `localhost` and `10.0.2.2` alone, because the development server speaks it.
- The prod flavor is a debuggable build with no signing configuration, and how Campfire reaches a device is undecided.
- The version is the shell's own, from the commits that touch `apps/android/` ([ADR 034](../../docs/decisions/034-version-each-artifact-from-its-own-commits.md)). The `campfire.version` and `campfire.build` Gradle properties default to `0.0.0` and build `1` as placeholders no release edits; a release passes both to Gradle.

## The bridge

`web/Bridge.kt` is one half of a versioned contract; the web half is in `libraries/host` and the Swift half in `apps/apple` ([ADR 018](../../docs/decisions/018-bridge-the-web-application-and-the-shells-with-versioned-messages.md)). The contract and its messages are in [The bridge](../../docs/guidebook/architecture/layers/bridge.md), and what each message means for navigation in [Navigation and routing](../../docs/guidebook/architecture/layers/navigation.md).

- Channel `campfire`, protocol version 1, JSON. A message that does not parse, carries another version, or names an unknown type is dropped, never guessed at.
- The transport is `WebViewCompat.addWebMessageListener`, restricted to the configured origin – the only channel that can be restricted. Trim the origin's trailing slash, or the call crashes.
- Without `WebViewFeature.WEB_MESSAGE_LISTENER` the tab is bridgeless and says so with a failure string. A shell that cannot talk to the page has failed.
- The main webview appends a `CampfireShell` token to the User-Agent, which is how [`libraries/host`](../../libraries/host/src/host.ts) knows it is in a shell. The identity webview does not.
- A theme arrives as a name, mapped in `theme/Theme.kt` to a Material 3 scheme. An unknown name falls back to blue.
- Sections arrive with a semantic icon name mapped to Material icons. An unknown name draws a neutral shape, because the web may lead the shells by a release.
- Signing in cancels the navigation to an identity origin and reopens it in a modal bottom sheet sharing the shell's cookie jar, so the cookies set on the way back land where the main webview reads them. Returning to the app origin closes the sheet and reloads the page; links out go to the system browser ([ADR 019](../../docs/decisions/019-authenticate-on-the-app-origin-through-scoutid.md), [Sign in](../../docs/guidebook/architecture/example-flows/sign-in.md)).
- A change to the contract changes all three halves at once, with the tests beside each.

## Where the shells differ

Differences chosen on each platform's own terms:

- A tab's webview is built when first shown and hidden rather than removed, because each off-screen webview keeps a renderer process alive. The Apple shell activates every tab on sign-in instead.
- There is no forward message, because there is no native swipe preview to cancel.
- The top bar uses Material typography. Bravely Script is the Apple shell's alone.
- The chrome is Compose and Material 3 end to end, with `NavigationSuiteScaffold` for the bars.

## Conventions

- Kotlin with Jetpack Compose and Material 3. Everything is `internal` unless something outside the shell needs it.
- ktlint formats, reading the root `.editorconfig`; Detekt checks, from `config/detekt/`, on top of its defaults so a new rule arrives switched on.
- Android Lint runs with `warningsAsErrors`, and each disabled check has its reason beside it ([ADR 006](../../docs/decisions/006-lint-and-format-with-a-shared-strict-toolchain.md)).
- Configuration is read once, in `Config.kt`, and nothing else reads `BuildConfig`.
- Strings live in `assets/values/strings.xml`, read with `stringResource`, with Swedish as the default resource set rather than a translation.
- Unit tests are JUnit 5 – a `@DisplayName` on the class and a `@Test` per case named as a sentence in backticks. The instrumented tests stay on JUnit 4, which Compose's testing library needs.
- Run Gradle through the root scripts or `apps/android/gradlew -p apps/android`, never a system Gradle.
- `pnpm start:android` needs something answering on `http://localhost:8000` – start a stack first. `pnpm test:android` compiles the instrumented suite without running it, so it cannot rot; `pnpm test:android:ui` runs it on an emulator.
- Continuous integration runs `check_android.yml` and `build_android.yml` on a pull request that touches the shell.
- Read the [architecture chapter](../../docs/guidebook/architecture/index.md) before a change that moves a boundary.

## Test quirks

- The JVM tests run against the `android.jar` stubs, with `isReturnDefaultValues = true` so a test can construct a type that mentions the platform. A stubbed call then answers a default instead of failing, so check that a test fails when it should before trusting it.
- A test that decodes JSON or URLs needs the real `org.json` on the test classpath and `java.net.URI` rather than `android.net.Uri`, because the stubs would otherwise answer nulls without failing.
