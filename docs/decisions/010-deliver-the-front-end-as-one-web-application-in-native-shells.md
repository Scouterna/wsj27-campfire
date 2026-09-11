# 010. Deliver the front-end as one web application in native shells

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Campfire's users are the leaders and the contingent management team – a few hundred adults who plan at a desk in the years before the jamboree and then stand in a field in Poland with a phone. That is three surfaces: the browser, an Android app, and an iPhone app, built by a handful of volunteers.

One force outweighs every other: deployability. During the three weeks of the trip a broken flow has to be fixable in minutes, and anything that ships through an app store waits days on a review while the people waiting are running a camp. What lives on the web deploys in one push. Behind it, clearly second: every screen built twice is a screen that drifts, and this team cannot staff three implementations of one UI.

A browser alone does not cover the phones. Asking hundreds of leaders to install the app has to be one instruction, and "search for Campfire in the store" is that instruction – Safari's share sheet is not. And the plans ahead will want a capability only native code has, reliable push first among them.

## Decision

We build every screen once, in the web application, and put it on phones inside native shells of our own – Kotlin and Compose on Android, Swift and SwiftUI on iOS – each hosting the web application in the platform's webview.

- **The shells are thin by rule.** Every word a user reads comes from the web application, and a shell owns only what the web cannot reach. Whatever a shell holds ships through store review, so the less it holds, the less ever waits on one.
- **The shell owes the web the platform.** Safe-area padding is the shell's job on Android, where `env(safe-area-inset-*)` reads zero, and context menus and link previews are off because they belong to a browser, not an app screen.
- **What crosses between them is a contract**, versioned through the shells' `CampfireShell` User-Agent token – kept compatible, never refactored as an internal call.

## Consequences

- A fix reaches the browser, Android, and iOS in one web deploy – during camp, in minutes instead of a store review. The single UI codebase comes with it.
- The shells change rarely, so store releases are rare, small, and boring.
- Apple's minimum-functionality guideline is a real review risk for an app that is "just a website", and how Campfire reaches devices – the public store, TestFlight, or managed distribution – is still open.
- Kotlin and Swift join the repository under ADR 006 and ADR 005, and a JDK and Xcode become prerequisites for whoever touches a shell and nobody else. Android is checked in continuous integration; Swift only in the pre-push hook, because a macOS runner is not spent on a shell that is only a webview.

## Alternatives considered

- **The PWA alone.** Zero native code, and it already installs from the browser. No store presence, an iOS install that cannot be talked through at contingent scale, and no road to native capabilities. It is not discarded: the shells wrap the same application.
- **React Native, with Expo.** One React codebase for the phones and, in theory, the browser. In practice the UI is rebuilt in React Native's primitives, the web becomes the second-class output, and a large, fast-moving dependency layer arrives between the app and both platforms.
- **Flutter, or Compose Multiplatform.** Both solve one UI for many platforms by replacing the web stack rather than reusing it – a new language or toolkit for a team invested in TypeScript.
- **Fully native apps.** The best feel on each platform, at the price of three implementations of every screen and two store reviews for every camp-time fix.
- **An off-the-shelf shell, such as Capacitor.** It does what these shells do and brings a plugin ecosystem, along with a framework's release cadence between the app and both platforms. The hand-rolled shells are a few hundred lines each, owned end to end.
