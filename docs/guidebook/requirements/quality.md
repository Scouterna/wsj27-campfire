# Quality attributes

Campfire is a tool people reach for while doing something else – walking between subcamps, standing in a queue, answering a leader who is standing right there. The qualities below are stated as intents; the numbers that make a threshold mean something are set per feature, in that feature's own requirements.

| Attribute       | What it has to hold to                                                                                                                                                                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deployability   | A broken flow can be fixed and shipped the same day, from a field, without anyone waiting on a review queue. This is the attribute the whole delivery shape was chosen for.                                                                                                 |
| Availability    | The application opens, signs a returning person in, and shows what it showed last time when the network is bad or gone. A read answers from cache first, and the cache outlives the session.                                                                                |
| Privacy         | The list of participants carries phone numbers, diets, allergies, and health notes, much of it about minors. Who may see what is decided by the back-end, not by the client, and a person outside the caller's scope is indistinguishable from a person who does not exist. |
| Security        | Identity is ScoutID's, the session is httpOnly cookies on the application's own origin, and no token ever reaches JavaScript. Nothing that grants access is in the repository.                                                                                              |
| Usability       | One product across a moving seam. A screen in the browser, in an installed PWA, and inside a native shell is the same screen, and the chrome around it is the only thing that changes.                                                                                      |
| Accessibility   | WCAG 2.2 Level AA is the standard, with the platform's own assistive technology working through the web content – VoiceOver and TalkBack, Dynamic Type through font sizes in `rem`, and animation that steps aside for reduced motion.                                      |
| Performance     | Navigation is instant because it does not wait: the screen draws from cache and refreshes behind itself. What a leader feels is the view transition, not a round trip.                                                                                                      |
| Maintainability | A capability is a module, modules do not know each other, and style is settled by tools rather than by review. Two people have to be able to keep this moving for eighteen months.                                                                                          |
| Compatibility   | Whatever phone a leader already owns, on whatever version it is on. The browser is a first-class way in, not a fallback, and the shells host the same application.                                                                                                          |
| Language        | Every word a user reads is Swedish. There is no translation layer, no locale switch, and no plan for one – the contingent is Swedish and so is the product.                                                                                                                 |

## Deployability comes first

The others matter; this one decides the architecture. For three weeks in the summer of 2027, roughly 2,600 people are on an island outside Gdansk and the only people who can fix Campfire are among them. A flow that breaks at the wrong moment has to be repairable in a deploy that takes minutes, not in a build that waits for a store review measured in days.

That is why every screen lives in the web application and the shells stay thin ([ADR 010](/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells)), why the web ships as one container image published on a version bump ([ADR 026](/decisions/026-publish-the-web-application-as-a-container-image)), and why what crosses into a shell is a versioned contract rather than code the shells depend on ([ADR 018](/decisions/018-bridge-the-web-application-and-the-shells-with-versioned-messages)). Each of those choices costs something. Together they buy the ability to fix things while the camp is still running.

Availability sits immediately behind it, and pulls in the same direction: a fix that has shipped is worth nothing to a phone with no signal, so the application is useful before the network answers ([ADR 017](/decisions/017-route-and-load-data-with-tanstack-router-and-query)).

## What the structure holds

Three of them are held by the shape of the repository rather than by any one feature.

- **Deployability.** The web image builds and publishes on a version bump ([Release](../maintenance/release)), and every screen is in the web application.
- **Accessibility, in its mechanics.** Every font size is written against the 17-point base, so a reader who has turned Dynamic Type up gets a bigger application rather than a clipped one ([Design](../design/)). The rest of AA is the standard each screen is held to, not a result on record.
- **Maintainability.** The module boundary is enforced by the package layout rather than by review ([Modules](../architecture/modules)), and the formatters, linters, and type checks run at zero tolerance ([The checks](../development/checks)).

## The measurable thresholds

The table states intents on purpose. How fast is fast, how long a cache may serve stale data, and how many participants a list must stay smooth through are numbers that belong to the feature that has to meet them, measured against a known state of the [mock back-end](../testing/mock) rather than against whatever the dev environment happens to hold that day. Each feature's requirements set the numbers, and this page stays the record of the standing intents they satisfy.
