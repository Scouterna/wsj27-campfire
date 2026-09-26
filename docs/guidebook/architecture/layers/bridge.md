# The bridge

The bridge is the contract between the web application and the native shells ([ADR 018](/decisions/018-bridge-the-web-application-and-the-shells-with-versioned-messages)). The shells draw a native navigation bar, tab bar, and back gesture, but every word in them belongs to the web, which owns the screens, the sections, and the color a person wears. So the web tells the shell, continuously, what it is showing, and the shell tells the web what was tapped. The web half lives in `libraries/host`, and each shell holds its own.

## One versioned channel

The two sides talk JSON over one channel named `campfire`, and every message carries its protocol version. A message that does not parse, carries another version, or names an unknown type is dropped, never guessed at.

That rule exists because the two sides do not ship together. The web deploys in minutes and a shell waits on store review, so a newer web inside an older shell is routine, and it has to degrade rather than misbehave.

## The messages

| Direction   | Type        | Carries                                                                                 |
| ----------- | ----------- | --------------------------------------------------------------------------------------- |
| Web → shell | `screen`    | The title, whether back applies, and the toolbar and menu items                         |
| Web → shell | `session`   | Whether someone is signed in, the sections they may open, and their initials and avatar |
| Web → shell | `theme`     | The name of the theme the person wears                                                  |
| Shell → web | `back`      | A back gesture, and whether the shell's own swipe already animated it                   |
| Shell → web | `forward`   | A canceled back swipe, to restore what it popped                                        |
| Shell → web | `popToRoot` | The active tab tapped again                                                             |
| Shell → web | `action`    | Which toolbar or menu item was tapped                                                   |
| Shell → web | `open`      | An address a native control wants shown, such as the profile                            |

A section in the `session` message is an id, a label, an address, and an icon, and the shell builds a tab from each ([Applications](../applications)).

A message carries text and state, never a color, a font, a size, or a layout value, because the native bars are styled natively – which is the reason for having them. A theme crosses as a name and an icon as a semantic name, and each shell maps them to its own palette and icon set: SF Symbols on Apple, Material icons on Android. An icon name a shell does not know draws a neutral shape instead of failing, because the web may lead the shells by a release.

## Knowing a shell is there

Each shell's main webview adds a `CampfireShell` token to its User-Agent. `libraries/host` reads it once, when the application loads and before anything renders, and freezes the answer, so the application knows its tier from the first frame and the other tier's chrome is never on screen. In a browser every sender is a no-op, so no screen has to ask which tier it is in.

## The transports

The platforms carry messages differently, and each transport stays in one file on its side:

- **Apple** – the web posts to a script message handler, and the shell answers by evaluating a function on the page, because a script message handler has no reverse channel.
- **Android** – the shell uses a web message listener restricted to the application's origin, chosen over a JavaScript interface because it is the only channel that can be restricted, and replies through the proxy it is handed.

## Changing the contract

The contract is written three times, in TypeScript, Swift, and Kotlin, and kept in step by hand, each side with tests for the malformed messages it drops. There is no negotiation between the sides, so a change stays additive: a new field is optional, an old one never changes meaning, and a change an older shell could not read ships as a new message beside the old one. A shell may lag the web and render only what it knows, so parity between the platforms is judged message by message.
