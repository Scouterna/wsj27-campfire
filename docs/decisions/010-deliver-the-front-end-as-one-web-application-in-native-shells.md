# 010. Deliver the front-end as one web application in native shells

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Campfire's users are the leaders and the contingent management team – a few hundred adults who plan at a desk before the jamboree and then stand in a field in Poland with a phone. That is three surfaces – the browser, Android, and iPhone – built by a handful of volunteers.

Deployability outweighs everything else. During the trip a broken flow has to be fixable in minutes, and anything that ships through an app store waits days on review. Second, every screen built twice drifts, and this team cannot staff three implementations of one UI. But on a phone Campfire has to feel like an app: the tab bar, the navigation bar, and the back gesture are what people touch most, and they are exactly what a webview imitates worst. Installing has to be one instruction – "search for Campfire in the store" – and some capabilities, such as reliable push, exist only in native code.

## Decision

We build every screen once, in the web application, and host it in native shells of our own – Kotlin and Compose on Android, Swift and SwiftUI on iOS – drawn so the app feels native even though its content is not.

- **The shell draws the chrome; the web draws the content.** The tab bar, the navigation bar, and the swipe back from the screen's edge are native, and a screen's title, back, actions, and menus appear in the bars as native controls. The web describes them; the shell renders them.
- **The web makes its own navigation feel native.** Moving between screens runs as a view transition in the direction of travel, and returning to a screen restores where it was scrolled, so the seam between web and native does not show.
- **The shells are otherwise thin.** Every word a user reads comes from the web application, and a shell owns only what the web cannot reach, so as little as possible ever waits on store review.
- **What crosses between them is a versioned contract** ([ADR 018](018-bridge-the-web-application-and-the-shells-with-versioned-messages.md)), kept compatible.

## Consequences

- A fix reaches the browser, Android, and iOS in one web deploy – in minutes rather than a store review – and there is one UI codebase.
- The native feel is only as good as the contract. Each screen's chrome crosses the bridge, so a screen the web describes badly looks wrong in both shells at once.
- The shells change rarely, so store releases are rare, small, and boring.
- Apple's minimum-functionality guideline is a real review risk for an app built on a webview.
- Kotlin and Swift join the repository under [ADR 005](005-pin-every-dependency-and-let-new-releases-age.md) and [ADR 006](006-lint-and-format-with-a-shared-strict-toolchain.md), and a JDK and Xcode become prerequisites for whoever touches a shell.

## Alternatives considered

- React Native, with Expo – native controls throughout, but the UI is rebuilt in its primitives, the browser becomes the second-class output, and a fix reaches phones without a store review only through a paid update service or an update server we host ourselves.
- The web application alone, installed from the browser – no native code, but a web-drawn tab strip feels like a website every time it moves, an iPhone install nobody can talk hundreds of leaders through, and no native capabilities.
- Flutter, or Compose Multiplatform – one UI by replacing the web stack, a new toolkit for a team invested in TypeScript.
- Fully native apps – the best feel on each platform, for three implementations of every screen and two store reviews for every fix at camp.
- An off-the-shelf shell such as Capacitor – a plugin ecosystem, and a framework's release cadence between the app and both platforms, where the hand-written shells are small and owned end to end.
