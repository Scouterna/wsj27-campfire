# 018. Bridge the web application and the shells with versioned messages

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

[ADR 010](010-deliver-the-front-end-as-one-web-application-in-native-shells.md) put the web application inside native shells and made what crosses between them a contract. A navigation bar is where the thin-shell rule gets tested: a native bar, a native tab bar, and a native back gesture are exactly what a webview cannot do convincingly, and every word in them belongs to the web application, which owns the screens, the sections, and the person's chosen color. So the shell has to be told, continuously, what the web is showing.

The two sides do not ship together. The web deploys in minutes and a shell waits on a store review measured in days, so a newer web application runs inside an older shell routinely and by design, and neither side may misbehave when it does. And the platforms carry messages differently: WebKit gives the page a handler to post into and nothing coming back, and Android has two mechanisms, only one of which can be restricted to an origin.

## Decision

We define one message contract on a channel named `campfire`, declared once in `libraries/host` and mirrored in Swift and Kotlin, with a protocol version on every message.

- **Three messages go web to shell** – `screen` (the title, whether back applies, the toolbar actions, and the overflow menu), `session` (signed in, the tabs the session may show, and the profile's initials and avatar), and `theme` (the name of the theme the person wears). **Five go shell to web** – `back`, `forward`, `action`, `open`, and `popToRoot`.
- **A message carries text and state only.** Nothing in it is a color, a font, a size, or a layout value. The theme crosses as a name each shell maps to its own palette, and an icon is a semantic name from a fixed vocabulary, mapped to SF Symbols on iOS and Material icons on Android. The native bars are styled natively, which is the whole reason for having them.
- **Every message carries a version, and an unrecognized message is dropped, never guessed at.** A payload that will not parse, carries a version the receiver does not know, or names an unknown type is discarded on both sides.
- **The host is detected once, from two facts** – the `CampfireShell/<version> (ios|android)` token the shell appends to the webview's User-Agent, and the channel object it injects. Both present means the shell tier; otherwise the browser tier, where every sender is a no-op, so no screen has to ask which tier it is in.
- **The transports differ, and stop at one file.** On iOS the page posts to a script message handler and the shell replies by evaluating JavaScript into a receiver the page exposes. On Android the shell installs a web message listener restricted to the configured origin, chosen over `addJavascriptInterface` because it is the one that can be.

## Consequences

- One contract, three implementations, kept in step by hand. A new field is an edit in TypeScript, Swift, and Kotlin, and a test in each, including a table of malformed messages every decoder must drop.
- Version 1 has no negotiation. A receiver knows "mine" or "not mine", so a version 2 either stays additive inside version 1 or ships as a second message beside the first – a thing to settle before the first breaking change rather than after it.
- The shells are allowed to lag. The web sends what it has and each shell renders what it knows, which is the contract working rather than drift, and it makes parity a question asked per message.
- The palette is duplicated: the five colors exist in the web's tokens and in each shell, and a change is a change in three places or none.
- Origin restriction is Android's. On iOS the handler is installed on the webview itself, so what keeps a foreign page away from it is the navigation policy: same-origin loads in place, everything else goes to the system browser.

## Alternatives considered

- **Intercept a custom URL scheme, or poll shared state.** The classic hybrid tricks. The first is one-directional, untyped, and length-limited; the second has no way to send anything back, and a navigation bar that catches up to its screen late is worse than no native bar.
- **Let the shells own navigation and ask the web only for content.** The best native feel, and it moves screen structure into code that ships through store review, which is what ADR 010 exists to avoid.
- **A ready-made bridge, from Capacitor or Hotwire Native.** Both solve this and both bring a framework's release cadence between the app and two platforms, for a contract eight message types wide.
- **Send styles rather than names.** A theme message carrying a hex value would remove the palette duplication. It would also make the native bars render the web's idea of a color one deploy behind, with no say in dark mode and no way to use the platform's own materials.
