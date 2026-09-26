# Applications

Campfire is one product shipped three ways: the web application in a browser, and the same application inside an Apple shell and an Android shell on a phone ([ADR 010](/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells)). Every screen is built once, in the web application. The shells draw the phone's chrome and little else, because whatever a shell holds waits on store review, and during the trip a review is days a broken flow stays broken. A fix in the web reaches the browser and both phones in one deploy.

Every word a user reads is Swedish and comes from the web application ([ADR 011](/decisions/011-write-every-word-a-user-reads-in-swedish)). The back-end services behind it are not built here; they are described at the bottom of this page because their contract shapes the front-end.

## The web application

`apps/web` is React and TypeScript built by Vite ([ADR 014](/decisions/014-build-the-web-application-on-react-with-vite)), with routing and data loading on TanStack Router and Query ([ADR 017](/decisions/017-route-and-load-data-with-tanstack-router-and-query)). It holds no feature of its own. It is the composition root – the one place that knows every module – and it merges their route and widget tables, runs the session gate, decides which sections a person is offered, and draws the chrome. The features are [modules](./modules).

The session gate stands in front of every screen. It asks the auth service who is signed in, hands the query cache to that person before any screen mounts, and then shows either the sign-in screen or the application. It keeps listening: a session that ends mid-use returns to the sign-in screen in place, and a session that changes hands reloads the page ([ADR 033](/decisions/033-recover-an-ended-session-at-the-query-client-and-the-gate)). [Presentation layer](./layers/presentation) describes the gate, and [Data layer](./layers/data) the cache behind it.

Behind the gate, the application offers each person the sections their roles grant: home for everyone, and the list of participants for leaders and the contingent management team. An address outside a person's sections answers exactly like one that matches nothing, so the application never shows what exists for other roles. The roles only decide what is offered – the back-end still decides what may be read.

Below the gate, the application branches once on its tier, which `libraries/host` reads from the User-Agent before the first render:

- **In a browser**, it draws the whole chrome – a side menu on a wide screen, and a navigation bar and a tab bar on a phone.
- **In a shell**, it draws no chrome. It reports the screen, the session, and the theme over [the bridge](./layers/bridge), and the shell draws native bars.

Nothing below that branch asks which tier it is in, so no screen can grow a native-only path by accident. Because the tier is known before anything renders, the other tier's chrome is never briefly on screen.

The application also installs from the browser as a progressive web app. A generated service worker precaches it, so it opens with no network, and a new deploy reloads an open page onto itself as soon as its worker takes over. The worker never answers the paths the back-end and the services beside it own, so a sign-in navigation always reaches the auth service rather than the cached application.

## The shell pattern

`apps/apple` (Swift and SwiftUI) and `apps/android` (Kotlin and Compose) have the same shape, because they do the same job. Each holds only what a webview cannot reach:

- the native navigation bar, tab bar, and back gesture, filled from what the web reports
- the cookie jar a sign-in round trip needs
- the placeholders shown before the first page paints, and a failure message when the web cannot be reached

**One origin per build.** A shell knows nothing about environments. It carries only the origin it loads the web application from – `http://localhost:8000` for local development, `https://campfire.wsj27.scouterna.net` for dev, and `https://campfire.wsj27.se` for prod ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)). Every build shares the identifier `se.scouterna.campfire`, so on a phone the builds replace each other, which is the accepted cost of one identity for one product. The local origin is always spelled `localhost`, because a session's cookies do not cross between spellings of one machine and ScoutID returns only to the host name it knows. That is why the Android emulator reaches the host through an `adb reverse` tunnel rather than its alias for the host.

**The shell talks to the web over the bridge.** The two sides exchange versioned JSON messages on one channel ([ADR 018](/decisions/018-bridge-the-web-application-and-the-shells-with-versioned-messages)). The web says what it shows – the title, the back control, the actions, the tabs, and the theme – and the shell says what was tapped. A message carries text and state, never a color or a size, and one a side does not understand is dropped, so a newer web in an older shell degrades rather than misbehaves. [The bridge](./layers/bridge) lists the messages.

**The tabs come from the web.** A shell starts with one webview showing whatever the gate shows. Once the web reports a session, the shell gives each tab a webview of its own, drops the sign-in webview so no back gesture can reach it, and hides rather than destroys a tab it leaves, so switching never reloads. An icon crosses as a semantic name each shell maps to its own set, and an unknown one draws a neutral shape, because the web may lead the shells by a release.

**Signing in happens in a modal.** A navigation to ScoutID is reopened in a modal webview – a sheet on Apple, a bottom sheet on Android – that shares the shell's cookie jar, so the session the auth service sets on the way back lands where the main webview reads it, and the page underneath reloads signed in ([ADR 019](/decisions/019-authenticate-on-the-app-origin-through-scoutid)). [Sign in](./example-flows/sign-in) walks the whole trip.

The shells are twins rather than translations of one file, and they differ where each platform has its own way:

| Difference   | Apple                                                                                      | Android                               |
| ------------ | ------------------------------------------------------------------------------------------ | ------------------------------------- |
| Platform     | iOS 26, iPhone only, because the application is laid out for a phone's width               | Android 11 (API 30) and later         |
| Project      | Generated by XcodeGen ([ADR 020](/decisions/020-generate-the-xcode-project-with-xcodegen)) | One Gradle module                     |
| Environments | One scheme per environment                                                                 | One product flavor per environment    |
| Tabs         | Every tab's webview made at sign-in                                                        | A tab's webview made when first shown |
| Theming      | Tints and title colors per theme name                                                      | A Material 3 color scheme per theme   |

## The back-end

The back-end services are Python services in repositories of their own ([ADR 013](/decisions/013-keep-the-back-end-services-in-their-own-repositories)). They run as containers on Scouterna's Kubernetes cluster in Azure, and the web application ships as a container image that runs beside them behind the same ingress ([ADR 026](/decisions/026-publish-the-web-application-as-a-container-image), [ADR 027](/decisions/027-run-the-web-beside-the-back-end-on-scouternas-cluster)). A service's internals are decided in its own repository; what this repository holds is the contract it consumes. Context describes the [auth service](../context/systems/auth-service) and the [participants service](../context/systems/participants-service).

Everything answers on one origin. Each back-end owns a prefix under `/api/` – `/api/auth` for the auth service and `/api/project` for the participants service – `/services/` and `/_services/` are kept for services that share the origin without being Campfire's back-end, and every other path is the web application's ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)). The front-end therefore has no base URL and no environment switch, and its cookies need no cross-origin exception, which matters most inside a webview. On a developer's machine the [mock](../testing/mock) answers the same prefixes, so an address that works locally works against dev unchanged.

The auth service gives Campfire a session as httpOnly cookies, so the web application never sees or stores a token. Three rules of the participants service shape the client:

- **Every read names an information level** – name, basic, or full, where full adds the health and dietary answers. A caller not allowed that much is refused rather than given less, so the client retries a refused full read at basic.
- **Scoping happens on the back-end.** A leader reads their own unit and the contingent management team reads everyone, and a person outside the caller's scope answers as if they did not exist. There is no "everyone I may see" read, so the [participants module](./modules#participants) composes the list one unit at a time.
- **The service owns the roles.** It decides who holds which role, and the auth service puts them in the session. The front-end reads them to choose what to show, and never invents a role or decides what one means.
