# Android

Read the [root `AGENTS.md`](../../AGENTS.md) first – it holds the conventions that apply everywhere. This file is what is true only of Kotlin, which lives in `apps/android` and nowhere else. What the shells are for is [ADR 010](../../docs/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells.md) and the guidebook's [Applications](../../docs/guidebook/architecture/applications.md) page.

The shell is thin by rule. Every word a user reads comes from the web application, apart from the tab labels the web supplies over the bridge and the failure strings in `assets/values/strings.xml` – which today holds only the app name, the one word the screen shows. A shell owns what a webview cannot reach: the tab bar, the top bar, predictive back, the cookie jar, and the launch surface. A screen belongs in [`apps/web`](../web/AGENTS.md).

## Layout

One Gradle build, with one module, `:app`. Its project directory is `config/app` rather than `src/app`, because a Gradle project directory is where its build file lives and a build file under `src/` lands inside the Kotlin source set that `src/` defines – Kotlin 2.4 compiles it and fails.

```text
apps/android/
├── settings.gradle.kts        includes :app and points it at config/app
├── build.gradle.kts           the plugin versions, ktlint for the two root scripts, and build output redirected to .build/
├── config/                    AndroidManifest.xml, and app/build.gradle.kts
├── assets/                    the res directory – values/, drawable/, mipmap-anydpi/, xml/
├── src/se/scouterna/campfire/ App.kt, Config.kt, MainActivity.kt
├── test/                      the JUnit 5 unit tests
└── test-ui/                   the instrumented tests, driving the real shell
```

The source sets are remapped in `config/app/build.gradle.kts`, so `config/`, `assets/`, `src/`, `test/`, and `test-ui/` mean here what they mean in every other app: there is no `src/main/kotlin` and no `src/main/res`. Build output goes to `apps/android/.build/<project>/`, outside the source tree; Gradle still writes the root project's problems report to `build/`, which is why that one directory is ignored separately by git and Prettier.

The package is `se.scouterna.campfire`, compiled against SDK 37 and targeting 36, with a minimum of 30, on JDK 21 bytecode. The shell is a build shape, not yet a shell: `MainActivity.kt` draws one centered word, `App.kt` is an empty `Application`, and `Config.kt` reads the origin. The package to build into is flat beside them – an app model holding the session, a section vocabulary, a `theme/` for the Material scheme, and a `web/` for the bridge, the tabs, and the identity flow.

## Flavors are origins, not environments

Three product flavors in the `stage` dimension – **local** (the default), **dev**, and **prod** – set one thing, `CAMPFIRE_WEB_ORIGIN`, as a `buildConfigField` read once by `src/se/scouterna/campfire/Config.kt`. That is the only thing they change, and nothing else in the app carries an address.

The shell never knows which environment is running; the environment is a property of the stack behind the origin ([ADR 012](../../docs/decisions/012-run-campfire-in-three-environments-on-one-origin.md), [The environments](../../docs/guidebook/development/environments.md)). One `applicationId`, `se.scouterna.campfire`, across all three – they replace each other on a device, which is the accepted cost. `local` is the default, so `assemble` and the IDE's run button mean what `pnpm start:android` means.

The local flavor reaches the host over the `adb reverse` tunnel `scripts/android/start.sh` opens, not the emulator's `10.0.2.2` alias: a session's cookies do not cross between spellings of the same machine, and ScoutID only returns to the one registered host name. `assets/xml/network_security_config.xml` permits cleartext for `localhost` and `10.0.2.2` and nothing else, because the development server speaks it and Android refuses it by default.

The prod flavor is not shippable today: it is still a debuggable build with no signing configuration, and how Campfire reaches a device is undecided.

## The bridge

`web/Bridge.kt` is to be one half of a versioned contract; the web half lives in `libraries/host` and the Swift half in `apps/apple/src/web/Bridge.swift` ([ADR 018](../../docs/decisions/018-bridge-the-web-application-and-the-shells-with-versioned-messages.md)).

- Channel name `campfire`, protocol version 1, JSON. A message that cannot be parsed, carries another version, or names an unknown type is dropped, never guessed at.
- The transport is `WebViewCompat.addWebMessageListener`, restricted to the configured origin. It is chosen over `addJavascriptInterface` precisely because it is the only channel that can be. Build the origin rule with the trailing slash trimmed – one with a slash crashes the call.
- When `WebViewFeature.WEB_MESSAGE_LISTENER` is unsupported the tab is declared bridgeless and says so with a failure string. A shell that cannot talk to the page is a failure, not a degraded mode.
- The main webview appends a `CampfireShell` token to the User-Agent, which is how [`libraries/host`](../../libraries/host/src/host.ts) knows a shell is there at all. The identity webview deliberately does not.
- The theme arrives as a name, never a color, and is mapped in `theme/Theme.kt` into a full Material 3 color scheme. An unknown name degrades to the default blue.
- A change to the contract is a change in all three places at once, with the tests beside each.

There is no channel in this tree, on either side. The message table is in [Applications](../../docs/guidebook/architecture/applications.md), and what each shell message means for navigation is in [Navigation and routing](../../docs/guidebook/architecture/layers/navigation.md). Signing in is to open a modal bottom sheet sharing the shell's cookie jar, the same round trip [Sign in](../../docs/guidebook/architecture/example-flows/sign-in.md) walks ([ADR 019](../../docs/decisions/019-authenticate-on-the-app-origin-through-scoutid.md)).

## Parity gaps to respect

The two shells are not two translations of one file, and pretending otherwise would make both worse. Some differences are choices taken on each platform's own terms; the rest are gaps with nothing clever behind them. Neither kind is papered over by inventing behavior.

None of the first four bullets is in this tree yet – the tabs, the messages, the display face, and the chrome all arrive with the bridge. They are the contract to build to, written down before either shell is built.

- Tab webviews are to be built when first shown rather than preloaded, and hidden rather than removed so switching never reloads. An off-screen WebView keeps a renderer process alive per tab, which is why. The Apple shell activates every tab on sign-in instead, deliberately.
- There is to be no forward message here, because there is no native swipe preview to cancel, and no profile control to ask for an address.
- Bravely Script is to be the Apple shell's alone, and the top bar here is to use Material typography. Today neither shell bundles the face – it lives in `libraries/ui` as a web font.
- The chrome is to be Compose and Material 3 end to end – `NavigationSuiteScaffold` for the bars – against SwiftUI on the other side. Theming is a plan on both: today each shell holds the tonal blue behind its launch screen, and draws its one screen in white or black to follow the system appearance.
- `test-ui/se/scouterna/campfire/WalkTests.kt` is a launch-only stub that proves the activity reaches `RESUMED`, and the Apple shell's is one too, waiting for its one screen. The real walk-through exists on neither side yet.

## Commands

| Command                                                 | What it does                                              |
| ------------------------------------------------------- | --------------------------------------------------------- |
| `pnpm start:android`                                    | Boots an emulator and launches the shell against :8000    |
| `pnpm build:android:dev` / `pnpm build:android:prod`    | Assemble only, against the deployed dev or prod origin    |
| `pnpm ide:android`                                      | Open the project in Android Studio                        |
| `pnpm check:android:format` / `pnpm check:android:lint` | ktlint; Detekt plus Android Lint                          |
| `pnpm format:android`                                   | ktlint, writing fixes                                     |
| `pnpm test:android` / `pnpm test:android:ui`            | The JVM unit tests; the instrumented tests on an emulator |

`start:android` refuses to run unless something answers on `http://localhost:8000`, so start a stack first – `pnpm start:local`, `start:dev`, or `start:prod`. It resolves one device through `scripts/android/emulator.sh`, addresses it by serial from then on, opens `adb reverse tcp:8000 tcp:8000`, then installs and launches the local flavor.

Run Gradle through the root scripts or `apps/android/gradlew -p apps/android`, never a system Gradle, so the wrapper and the working directory are the ones the build expects.

`pnpm test:android` runs the JVM unit tests and compiles the instrumented suite without running it, so it cannot rot; `pnpm test:android:ui` runs it on an emulator ([UI tests](../../docs/guidebook/testing/ui.md)). Continuous integration covers this shell – `check_android.yml` and `build_android.yml` run on pull requests that touch it, and the instrumented suite is compiled there, never run, because emulators on hosted runners cost more attention than they save.

## Conventions

- Kotlin with Jetpack Compose and Material 3, on JDK 21 bytecode. Everything inside the shell is `internal` unless something outside needs it.
- Formatting is ktlint's (`ktlint_official`, two-space indent, 100 columns, from the root `.editorconfig`, which is why that file sits at the root rather than under `config/`). Rules are Detekt's (`config/detekt/`), layered on its defaults so a rule added in a future release arrives switched on. Run the formatter rather than aligning anything by hand.
- Android Lint runs with `warningsAsErrors`, with the reason beside each disabled check: `OldTargetApi`, because which API level to target is a decision taken deliberately, and the three version-upgrade checks, because [ADR 005](../../docs/decisions/005-pin-every-dependency-and-let-new-releases-age.md) decides versions, not a linter ([ADR 006](../../docs/decisions/006-lint-and-format-with-a-shared-strict-toolchain.md)).
- Configuration is read once, in `Config.kt`, and nothing else in the app reads `BuildConfig`.
- Strings live in `assets/values/strings.xml`, read with `stringResource(R.string.…)`, with Swedish as the default resource set rather than a translation – so every device gets it whatever its language.
- Tests are JUnit 5 – a `@DisplayName` on the class, a `@Test` per case named as a sentence in backticks, `org.junit.jupiter.api.Assertions` – under `test/`, mirroring `src/`. The instrumented tests in `test-ui/` stay on JUnit 4, because that is what Compose's testing library is built on; today they prove the activity reaches `RESUMED`, and the walk-through proper arrives with the first web screens.
- A change here passes `pnpm check:android:format`, `pnpm check:android:lint`, and `pnpm test:android` before it is handed back.
- Read the [architecture chapter](../../docs/guidebook/architecture/index.md) before a change that moves a boundary. It describes the first version as built, so read the code beside it for what exists.

## Test quirks worth knowing before you fight them

The JVM unit tests run against the `android.jar` stubs, which throw on every call, so `isReturnDefaultValues = true` is set deliberately: it lets a test construct a type that merely mentions the platform. The cost is that a stubbed call answers with a default instead of failing, so a test can quietly assert nothing – check that a test fails when it should before trusting it.

Two more workarounds follow from the same stubs the moment the bridge lands, and both are deliberate: put the real `org.json` on the test classpath rather than asserting against the stub's nulls, and parse URLs with `java.net.URI` rather than `android.net.Uri`. Removing either will not fail loudly.
