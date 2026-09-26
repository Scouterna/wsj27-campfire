# 018. Bridge the web application and the shells with versioned messages

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

[ADR 010](010-deliver-the-front-end-as-one-web-application-in-native-shells.md) made what crosses between the web application and the shells a contract. The shells draw a native navigation bar, tab bar, and back gesture, and every word in them belongs to the web, which owns the screens, the sections, and the color a person wears – so the shell is told, continuously, what the web is showing.

The two sides do not ship together. The web deploys in minutes and a shell waits on store review, so a newer web inside an older shell is routine, and neither side may misbehave when it happens. The platforms carry messages differently: WebKit gives the page a handler to post into, and of Android's two mechanisms only one can be restricted to an origin.

## Decision

We define one message contract on a channel named `campfire`, declared once in `libraries/host` and mirrored in Swift and Kotlin, with a protocol version on every message.

- **The web tells the shell what it shows, and the shell tells the web what was tapped.** The messages and what each carries are listed on the guidebook's [Bridge](../guidebook/architecture/layers/bridge.md) page, and adding one is additive.
- **A message carries text and state only**, never a color, font, size, or layout value. A theme crosses as a name and an icon as a semantic name, each mapped by the shell to its own.
- **An unrecognized message is dropped, never guessed at** – a payload that does not parse, an unknown version, or an unknown type.
- **The host is detected once**, from the `CampfireShell/<version> (ios|android)` User-Agent token and the injected channel object. Without both, the tier is the browser and every sender is a no-op.
- **The transports differ, and stop at one file.** iOS posts to a script message handler and replies by evaluating JavaScript; Android uses a web message listener restricted to the configured origin, over `addJavascriptInterface`, which cannot be restricted.

## Consequences

- One contract in three languages, kept in step by hand, each with the same table of malformed messages its decoder drops.
- There is no negotiation, so a change either stays additive or ships as a second message beside the first.
- A shell may lag the web, rendering what it knows, so parity is asked per message.
- The unit colors live in the web and in each shell, and a change is made in three places.
- On iOS the handler is on the webview itself, so the navigation policy – other origins open in the system browser – keeps foreign pages away from it.

## Alternatives considered

- Shells owning navigation – screen structure would ship through store review, which ADR 010 avoids.
- Capacitor's or Hotwire Native's bridge – a framework's release cadence for a small contract.
- Sending styles rather than names – the native bars would render the web's colors one deploy behind, with no say in dark mode.
