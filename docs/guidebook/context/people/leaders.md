# Leaders

A leader – ledare in the contingent's own material – is one of the four adults responsible for a unit. A unit is 36 scouts and 4 leaders, and the Swedish contingent has 53 of them inside a delegation of roughly 2,600 people. The four share the responsibility for their unit rather than splitting it, so Campfire treats them as one kind of person with one kind of scope: their own unit, all of it.

That makes leaders the largest audience Campfire has – a little over two hundred people, against a contingent management team of a few dozen. It is also the person the application is shaped around first. Everything unit-scoped in the app exists because a leader needs it in a place with 2,600 people, patchy reception, and no time to hunt for a phone number.

## At camp and before it

The camp runs 30 July – 8 August 2027 on Wyspa Sobieszewska outside Gdansk, and Scouterna frames the Swedish period as 29 July – 9 August to include arrival and departure. A leader travels with their unit on one of two options: the rundresa, a tour through Latvia and Lithuania leaving Sweden 21–22 July, or the direktresa, leaving 26–27 July to join the rest of the contingent in Olsztyn and travel on to the camp together. Everyone comes home 9–10 August.

On site the unit lives in one of the jamboree's 16 subcamps, each holding around 2,250 people and 56 units. The program is ZHP's and WOSM's to run, not Sweden's, so a leader spends the day accounting for 36 teenagers who are scattered across activities somebody else scheduled. Their questions are small and constant: who is where, who is unwell, who has the number for the CMT-jour, and is the unit whole.

Before camp there is a year of preparation. Leaders are notified in spring 2026, meet twice in person across 2026–2027 with digital meetings between, and their scouts attend two förträffar – autumn 2026 to build the group, spring 2027 to make it ready to travel.

## In the application

Signing in with ScoutID drops a leader on the home screen. Below the greeting sit the contingent's messages until they are closed, then the countdown to departure, then their unit's leaders, their unit's scouts, and a tap-to-call plate of emergency numbers that only leaders see.

The section menu gives them two places: the start screen, and their own unit – the list of participants scoped to the unit they lead. That view needs neither the search field nor the role filters the wider list of participants has, because a list of forty people needs neither. Opening a person shows what the back-end chose to send: contact details and relatives, travel, diet and health, languages, readiness, and experience.

The whole application takes the unit's color. Each unit has one of the five colors the [design system](../../design/) carries, and the theme is stamped on the document before first paint, so a returning brown-unit leader never flashes blue.

## What it is meant to give them

Seeing the participants in their unit is Campfire's first feature, and the screens above are that feature. Status reporting is the first anchor after it, and the leader is the person it is aimed at: saying their unit is accounted for, quickly, from a phone that may be offline. The application caches for a field in Poland rather than for a desk ([ADR 017](/decisions/017-route-and-load-data-with-tanstack-router-and-query)), which is the half of that problem the front-end can solve on its own. The other half – where a report goes and who reads it – waits on a service that does not exist. Both anchors are directions rather than specifications; [Scope](../../requirements/scope) has what is settled.

## Signing in, and what they see

Two separate answers, and one role carries both.

- **That the person is a leader, and which unit they lead** is one fact: the role `wsj27:al:<unit>`, which the [participants service](../systems/participants-service) derives from Scoutnet and the [auth service](../systems/auth-service) mints into the session.
- **What they may read** is the back-end's call, not the app's. A leader reads their own unit at any level – health answers included, because a unit's leaders are its first responders – and nothing else. A person outside it answers 404, indistinguishable from a person who does not exist, so the list of participants never leaks who is in it.

A leader's unit – troop, in the participants service's own vocabulary – is its deltagare and ledare, and deliberately not its IST: an IST member belongs to a patrol, not to a unit's leaders, and the service does not carry the patrols. The [mock](../../testing/mock) enforces the same rule with the same role, so what a leader sees locally is what they see for real ([ADR 021](/decisions/021-stand-in-for-the-back-end-with-a-seeded-mock)).
