# CMT – Health

Health is one of the three parts of the Support function. It helps the units and the IST with health questions, runs Listening Ears, and prepares the personal matters a camp of roughly 2,600 people, most of them teenagers, generates over twelve days in another country. It is the function Campfire's list of participants is most obviously built for, and the one behind the second of the product's two anchors.

The participants service calls the function **Hälsosupport**, and its color in the contingent's identity is green.

## At camp and before it

The jamboree fee covers on-site first aid and pre-hospital care for illness and accidents. It does not cover pre-existing conditions, medications, specialist care, or hospitalization, and personal insurance is mandatory for exactly that reason. So Health carries a specific burden: when a Swedish scout ends up in a Polish clinic, the function is the one that has to know what the clinic needs to be told, in a language nobody in the room shares.

Before camp the work is collecting that knowledge – the answers each member gave when they registered – and turning it into something usable on site: who needs medication kept cold, who needs power for a CPAP, who cannot eat what the kitchen is cooking, who should not be put in a crowd. During camp it is a steady trickle of small things: a fever, a sprained ankle, a scout who has stopped eating.

## In the application

Health signs into the same application as everyone else and gets the unscoped list of participants: search across name, belonging, and member number, filter chips for the participation roles, and a person's page behind every row.

That person's page is where the function's data lives, and it is the most detailed thing Campfire draws. A participant's health section can carry a special diet with free-text details, graded food allergens, other allergies, the childhood vaccination program with its boosters and the year each was given, prescription medication with storage needs and whether the person manages it themselves, medical conditions, equipment needs such as CPAP charging or refrigeration, mobility aids, cognitive diagnoses, phobias, mental-health conditions, whether a personal assistant is needed, and sensitivity to unpredictability. Each section renders only when its data arrived, so a person with nothing to declare shows nothing rather than a wall of "Nej".

The Swedish labels the participants service exports are mapped to the domain model at the boundary, spelling quirks and all, so the client never sees the source's typos.

## What it is meant to give them

Lightweight issue tracking is the anchor aimed at this function. A camp of that size generates a steady stream of small things that need to be seen, assigned, and closed, and a shared list with an owner and a state beats a group chat that scrolls away. It is a direction, not a specification, and when it is picked up its requirements are written against an issue the way [Process](../../process/) describes.

## Signing in, and what they see

Sign-in is ScoutID like everyone else's ([ADR 019](/decisions/019-authenticate-on-the-app-origin-through-scoutid)). The role `wsj27:cmt:support:halsa` marks the Support function's health people, and the front-end treats it as management without distinguishing it from the other functions.

The health answers are theirs to read, and almost nobody else's. The [participants service](../systems/participants-service) recognizes exactly two health grants – `wsj27:cmt:support:halsa`, and a per-person access grant given in Scoutnet – and only a caller holding one reads the list of participants at the full level, contingent-wide. Everyone else in the management gets a 403 on the health answers, never a quietly emptier page. The [mock](../../testing/mock) enforces the same two grants, so what the health function sees locally is what they see for real.
