# Quality attributes

Campfire is a tool people reach for while doing something else – walking between subcamps, standing in a queue, answering a leader who is standing right there. These are the qualities it is held to. They are stated as intents: the numbers that make one measurable – how fast, how stale, how many rows – are set by the feature that has to meet them, in its own requirements, and measured against the known state of the [mock back-end](../testing/mock) rather than whatever the dev environment holds that day.

| Attribute       | What it holds to                                                                                                                                                                                                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deployability   | A broken flow is fixed and shipped the same day, from the field, without waiting on a store review ([ADR 010](/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells)).                                                                                                                        |
| Availability    | The application opens and shows what it showed last time when the network is bad or gone, because every read answers from a cache that survives a restart ([ADR 017](/decisions/017-route-and-load-data-with-tanstack-router-and-query)).                                                                            |
| Privacy         | The list of participants carries phone numbers, diets, allergies, and health notes, much of it about minors. The back-end decides who sees whom, a person outside the reader's scope looks exactly like one who does not exist, and the cache is wiped when the session ends or someone else signs in on the device. |
| Security        | Identity is ScoutID's, the session is httpOnly cookies on the application's own origin, and no token reaches JavaScript ([ADR 019](/decisions/019-authenticate-on-the-app-origin-through-scoutid)). Nothing that grants access is committed to the repository.                                                       |
| Usability       | A screen is the same screen in the browser, installed from it, and inside a shell. Only the chrome around it changes.                                                                                                                                                                                                |
| Accessibility   | WCAG 2.2 Level AA, with VoiceOver, TalkBack, Dynamic Type, and reduced motion working through the web content ([Design](../design/)).                                                                                                                                                                                |
| Performance     | Navigation does not wait for the network: a screen draws from the cache and refreshes behind itself, and a list the size of the whole contingent scrolls smoothly ([ADR 036](/decisions/036-virtualize-a-list-that-can-grow-to-the-contingents-size)).                                                               |
| Maintainability | A capability is a module, modules never import each other, and style is settled by tools rather than by review ([ADR 016](/decisions/016-compose-the-web-application-from-feature-modules), [ADR 006](/decisions/006-lint-and-format-with-a-shared-strict-toolchain)).                                               |
| Compatibility   | Whatever phone a leader already owns. The browser is a full way in, not a fallback, and the shells host the same application.                                                                                                                                                                                        |

## Deployability comes first

The others matter; this one decides the architecture. For three weeks in the summer of 2027 the contingent is on an island in Gdansk, and the only people who can fix Campfire are among them. A flow that breaks at the wrong moment has to be repairable in a deploy that takes minutes, not in a build that waits for a store review measured in days. That shapes the delivery:

- Every screen is in the web application, and the shells stay thin ([ADR 010](/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells)).
- The web ships as one container image, published by the merge that earns a new version and promoted to prod by moving a tag ([ADR 026](/decisions/026-publish-the-web-application-as-a-container-image), [ADR 034](/decisions/034-version-each-artifact-from-its-own-commits), [ADR 035](/decisions/035-promote-the-web-by-moving-environment-tags)).
- A page that is already open reloads onto a new deploy by itself, through its service worker, and checks for one whenever it returns to the foreground.
- What crosses into a shell is a versioned contract, so a new web version needs no new shell ([ADR 018](/decisions/018-bridge-the-web-application-and-the-shells-with-versioned-messages)).

Availability sits right behind it and pulls the same way. A fix that has shipped is worth nothing to a phone with no signal, so the application is useful before the network answers.

## What the structure holds

Some qualities are held by the shape of the repository rather than by any one feature:

- **Accessibility, in its mechanics.** Every font size is written against a 17-point base that follows the text size the reader has set, so a reader who has turned the text up gets a bigger application rather than a clipped one ([Design](../design/)). The rest of AA is the standard each screen is held to.
- **Maintainability.** The module boundary is enforced by the package layout rather than by review ([Modules](../architecture/modules)), and the formatters, linters, and type checks run with warnings as failures ([The checks](../development/checks)).
