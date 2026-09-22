# Applications

Campfire is one product shipped three ways: the React web application in a browser, and the same application inside an Apple shell and an Android shell on a phone ([ADR 010](/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells)). Every screen is built once, in `apps/web`; the shells hold the phone's chrome and nothing else.

The two back-end services are not ours to build, and they are described at the bottom of this page because the front-end is shaped by their contract.

## The web application

`apps/web` is where every screen Campfire has is drawn – in a browser, and inside both shells. It is React 19 and TypeScript, built by Vite ([ADR 014](/decisions/014-build-the-web-application-on-react-with-vite)), and it is small by design: a route table, a widget table, a session gate, two chromes, and a query client. Everything else is a [module or a library](./code-organization).

```text
apps/web/
├── index.html    the document: the cascade layer order, the icons, and the two entry points
├── assets/       served verbatim – the favicon, the app icons, the PWA's images
└── src/
    ├── main.tsx  the composition root, mounting what the modules export
    └── app.css   the page frame, and the one import of the design system's stylesheet
```

The document is Swedish (`lang="sv"`), and so is every word a user reads. The cascade order – `@layer tokens, fonts, reset, base, component, screen` – is declared inline in `index.html` before any stylesheet loads, which is why nothing in the application depends on the order its CSS happens to arrive in. `viewport-fit=cover` is what makes the safe-area insets non-zero once the application is installed.

Vite's configuration is shared at `config/vite/vite.config.ts` and run with `--config`, kept in `config/` with every other tool's. It serves `assets/` as the public directory, builds into `apps/web/.build`, and runs the dev server on port 3000 with `strictPort`, so the port is a fact rather than a guess.

### Installable

`vite-plugin-pwa` generates the manifest and the service worker, registered with `autoUpdate` so a deploy reaches an installed application on the next load without asking. The precache covers everything the built application is made of: `js`, `css`, `html`, `svg`, `png`, `ico`, and `woff2`. Navigations under `/api/`, `/_services/`, and `/services/` are kept off the fallback, because those paths belong to what the ingress serves beside the application – sign-in and sign-out are full-page navigations to the auth service, and the CMS lives under `/_services/cms` – and a precached shell served in their place would break them.

The manifest is Swedish, named Campfire, `display: standalone`, with `id`, `start_url`, and `scope` all at `/`. Its theme color is `#215262` – the darker tonal blue the app icon's brush mark carries – and its background is `#f4f2ec`, the paper the whole application is drawn on, so the launch surface matches the first screen. Both shells' launch screens hold `#2a778a` instead, the same blue `--color-theme-blue` names.

### The composition root, the gate, and the chromes

Routing and data loading run on TanStack Router and TanStack Query ([ADR 017](/decisions/017-route-and-load-data-with-tanstack-router-and-query)).

The application branches exactly once, on which tier it is running in, and never again:

- **The shell chrome** draws no chrome at all. It reports the session, the theme name, and the current screen over the bridge, and subscribes to what the shell sends back. The native bars are the chrome.
- **The browser chrome** draws the whole thing in the web: a side menu on desktop, a sticky navigation bar, the content column, the outline column, and a tab bar on phones.

Branching once is deliberate. Nothing below that point asks whether it is in a shell, so a screen cannot grow a native-only path by accident. The branch is a constant computed before the first render, so chrome belonging to the other tier is never briefly visible.

Above the branch sits the session gate, and its order matters: ask the auth service who is signed in, hand the cache its new owner before any screen mounts, then show either the sign-in screen or the chrome. [Presentation layer](./layers/presentation) describes the gate, and [Data layer](./layers/data) the cache that hangs on it.

`libraries/host` answers which tier the application is in. It reads the `CampfireShell` token off the User-Agent once, at module evaluation, and freezes the answer – a fact that is fixed before the document is requested, so there is no message to wait for and no frame in which the wrong chrome is on screen.

## The shell pattern

`apps/apple` and `apps/android` put the web application on a phone. Swift 6 and SwiftUI on one side, Kotlin, Compose, and Material 3 on the other, each owned end to end, and each the same shape because the job is the same.

**Thin by rule.** Every word a user reads comes from the web application. A shell holds the four things a webview cannot reach: the native navigation bar and tab bar, the cookie jar a sign-in round trip needs, the placeholders shown before the first document paints, and a full-screen failure message when the web cannot be reached at all.

The rule is deployability made structural. Whatever a shell holds ships through store review, and during the three weeks of the trip a review is days a broken flow stays broken. So the less a shell holds, the less ever waits on one.

Both shells are Swedish-first – the Apple side through `Localizable.xcstrings` with `sv` as the source language, the Android side with Swedish as the default resource set rather than a translation.

### One origin per build

A shell never knows which environment is running; the environment is a property of the stack behind the origin ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)). What a build does carry is the origin it points at.

| Environment | Origin                                 | Apple                              | Android                      |
| ----------- | -------------------------------------- | ---------------------------------- | ---------------------------- |
| Local       | `http://localhost:8000`                | `apps/apple/config/Local.xcconfig` | `local` flavor (the default) |
| Dev         | `https://campfire.wsj27.scouterna.net` | `apps/apple/config/Dev.xcconfig`   | `dev` flavor                 |
| Prod        | `https://campfire.wsj27.se`            | `apps/apple/config/Prod.xcconfig`  | `prod` flavor                |

On Apple the xcconfig value reaches the app through a `Campfire` dictionary in the generated `Info.plist` and is read by `src/Config.swift`, which halts launch if it is missing rather than letting the app request against an origin it guessed at; the project itself is generated from `project.yml` by XcodeGen ([ADR 020](/decisions/020-generate-the-xcode-project-with-xcodegen)). On Android the same value is a `buildConfigField` per product flavor in the `stage` dimension, read once by `Config.kt`. Nothing else in either shell carries an address.

Both keep one identifier across all three environments – `se.scouterna.campfire` on both platforms – so the builds replace each other on a phone, which is the accepted cost of not maintaining three identities for one product. `pnpm start:apple` and `pnpm start:android` always build the local flavor, against `http://localhost:8000`.

Cookies live on `localhost` specifically – not `127.0.0.1`, not `10.0.2.2` – because a session's cookies do not cross between spellings of the same machine, and ScoutID only returns to the one host name it has registered. That is why `pnpm start:android` opens an `adb reverse tcp:8000 tcp:8000` tunnel instead of pointing the emulator at the host's alias.

### The bridge

The shells and the web talk over one channel named `campfire`, in JSON, every message carrying its protocol version ([ADR 018](/decisions/018-bridge-the-web-application-and-the-shells-with-versioned-messages)). A message that cannot be parsed, carries another version, or names a type the receiver does not know is dropped, never guessed at – so a newer web application against an older shell degrades rather than misbehaves.

| Direction   | Type        | Carries                                                                                           |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------- |
| Web → shell | `screen`    | `title`, `canGoBack`, toolbar `actions`, and `menu` as groups of items                            |
| Web → shell | `session`   | `signedIn`, the `tabs` the session is allowed, and the profile's initials and optional avatar URL |
| Web → shell | `theme`     | The theme's name – `blue`, `brown`, `green`, `red`, or `yellow`                                   |
| Shell → web | `back`      | Optionally that the shell's own swipe already animated the pop                                    |
| Shell → web | `forward`   | Restore the layer a canceled back swipe popped                                                    |
| Shell → web | `popToRoot` | The active tab was reselected                                                                     |
| Shell → web | `action`    | The `id` of the toolbar or menu item that was tapped                                              |
| Shell → web | `open`      | A `path` the shell wants shown, such as `/profile`                                                |

Nothing in that table is a color, a font, a size, or a layout value, and nothing in it ever will be. The native bars are styled natively, which is the entire reason for having them – the `theme` message carries a name, and each shell maps the name to its own palette.

The web knows a shell is there at all through the User-Agent: each main webview appends a `CampfireShell` token to the default agent, and `libraries/host` reads it.

The transports differ because the platforms do. On Apple the web posts to a script message handler and the shell answers by evaluating a function on the page, since a script message handler has no reverse channel. On Android the shell uses `WebViewCompat.addWebMessageListener`, chosen over `addJavascriptInterface` because it is the only channel that can be restricted to an origin, and replies through the reply proxy it is handed.

### The tabs come from the web

A section is an id, a label, a path, and an icon, and all four arrive in the `session` message. The icon is a semantic name from a shared vocabulary, which each shell maps to its own icon set: SF Symbols on Apple, Material icons on Android. A name neither shell knows yet renders as a neutral shape instead of crashing, because the web composition may lead the shells by a release.

Each shell starts with one webview pointed at `/`, showing whatever the web's session gate shows. When a `session` message arrives it builds one webview per reported tab, discards the sign-in webview entirely so no back gesture can reach it, and selects the first tab. Switching tabs never reloads: the webviews are hidden rather than destroyed.

### Signing in happens in a modal

A sign-in round trip leaves the app's origin for ScoutID and comes back. Both shells watch for that: a navigation to a configured identity origin is canceled, and an identity flow opens modally instead – a sheet on Apple, a modal bottom sheet on Android.

The modal webview shares the shell's cookie jar, which is the whole point. The cookies the auth service sets on the way back land where the main webview will read them. Inside the flow, identity-origin pages and the app origin's sign-in leg load; any other app-origin URL means the round trip is over, so the sheet closes and the page underneath reloads and picks up the new session. Links out of the flow – terms, help – go to the system browser. Signing out uses the same mechanism, and [Sign in](./example-flows/sign-in) walks the whole trip.

The identity webview deliberately carries no `CampfireShell` token: the identity provider is an ordinary web site, not a hosted app.

### Where the shells differ

They are not two translations of one file, and pretending otherwise would make both worse. Some differences are choices taken on each platform's own terms; the rest are gaps with nothing clever behind them.

| Difference   | Apple                                        | Android                                             |
| ------------ | -------------------------------------------- | --------------------------------------------------- |
| Platform     | iOS 26, iPhone only, Swift 6 and SwiftUI     | minSdk 30, compiled against SDK 37, Kotlin, Compose |
| Project      | Generated from `project.yml` by XcodeGen     | One Gradle module, `:app`, rooted at `config/app`   |
| Environments | Three schemes over six build configurations  | Three product flavors in the `stage` dimension      |
| Theming      | Per-theme inks, used as tint and title color | A full Material 3 color scheme per theme            |
| UI tests     | XCUITest, driving the real shell             | An instrumented suite, on JUnit 4 for Compose       |

The Apple shell is bounded twice on purpose. `supportedDestinations` holds it to iOS and `TARGETED_DEVICE_FAMILY` to iPhone, because the platform setting alone still produces an iPad build – and this phone-width application is not laid out for one. iPadOS, macOS, watchOS, tvOS, and visionOS are out of scope until somebody decides otherwise.

## The back-end

The back-end is two services, each written in Python, each in its own repository, and each shipped as its own container image ([ADR 013](/decisions/013-build-the-back-end-as-python-services-in-their-own-repositories)). The recorded direction is that they run as containers on Kubernetes in Azure, with the web application's own image ([ADR 026](/decisions/026-publish-the-web-application-as-a-container-image)) alongside them behind one ingress ([ADR 027](/decisions/027-run-the-back-end-on-kubernetes-in-azure)) – the dev cluster already serves `campfire.wsj27.scouterna.net`, and nothing in this repository deploys to it: the web image is handed over by hand.

Neither is a container of Campfire, which is why the C4 model draws each as a software system of its own. A service's internals – its framework, its data stores, its schemas – are decided in its own repository, not here. What this repository holds is the contract it consumes.

### One origin, path-routed

Everything answers on one origin, and each service owns a path prefix under `/api/`, behind a single ingress ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin), [ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)). `/api/auth` belongs to the auth service, `/api/project` to the participants service, and everything outside `/api/` – the root included – is the web application's.

That is not a deployment detail; it is the constraint that makes the rest work. The front-end has no environment switch and no base URL – it asks for `/api/auth/user` and `/api/project/participants`, and the ingress decides who answers. Cookies then work with no cross-origin exception anywhere, which matters most inside a webview, where third-party cookie rules are strictest and hardest to reason about. Any service added later takes `/api/<service>` on the same origin for the same reason.

### The auth service

The auth service owns `/api/auth` and gives Campfire a session and nothing else ([ADR 019](/decisions/019-authenticate-on-the-app-origin-through-scoutid)):

| Path                          | What it does                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `/api/auth/login`             | Full-page redirect to ScoutID, and back to the given return address when it is done                |
| `/api/auth/callback`          | The return leg – the one place the session cookies are minted                                      |
| `/api/auth/user`              | The signed-in user, or a refusal                                                                   |
| `/api/auth/refresh`           | Re-mints the short-lived access token from the refresh cookie                                      |
| `/api/auth/logout`            | Drops the session, and signs out of ScoutID too                                                    |
| `/api/auth/static/refresh.js` | The service's own script, which watches a public expiry cookie and refreshes while the app is open |

The session is httpOnly cookies. The web application never sees a token, which is why it never stores one and never has to decide where to. Roles arrive flattened, as a colon-separated hierarchy, and the front-end reads them through one adapter, so replacing the mapping is replacing a file – see [Sign in](./example-flows/sign-in).

### The participants service

The participants service owns `/api/project`. It fetches the WSJ27 project's list of participants from Scoutnet, decodes the form answers, and serves them one troop at a time:

| Path                                              | What it does                                                                       |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `/api/project/participants/troopinfo/{troop}`     | One troop's participants, or one member type's – `al`, `ist`, and `cmt` shorthands |
| `/api/project/participants/individual/{memberNo}` | One person                                                                         |
| `/api/project/participants/roles`                 | The member-to-roles map the auth service mints tokens from                         |

Three rules of its contract shape the client more than any payload field does.

**Every answer takes an information level** – name, basic, or full. Basic carries the person and their contact answers; full adds the health and dietary answers, and needs a health grant. A caller who may see the person but not that much is refused outright rather than quietly given less, which is why the client retries a refused full answer at basic.

**Scoping happens on the back-end, and the client composes.** A unit's leader reads their own troop and nothing else; the contingent management reads everyone. A person outside the caller's scope answers as if they did not exist, so the list of participants does not leak who is in it. There is no "everyone I may see" endpoint, so the client builds the whole list of participants from the troop listings – the [participants module](./modules) owns that composition.

**The service owns the role model.** It derives the roles from the project's own data – which troop a leader leads, which function of the contingent management somebody serves in, and the grants given to one person at a time. The auth service mints them into tokens, and the front-end's role translation reads them back; nothing in the front-end invents a role or decides what one means.

On a developer's machine the [mock](../testing/mock) stands in for both services on the same two prefixes, so an address that works locally works against dev unchanged.
