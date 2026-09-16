# Scope

Campfire is a digital companion for the people running Sweden's contingent to WSJ27 – the leaders of the 53 units and the contingent management team. Participants are not its audience; their jamboree is the program, the patrol, and the subcamp, and it is the people looking after them who need a tool.

The feature set is open on purpose. Campfire started as a way to explore the concept rather than as a specification to build, so what it does is discovered through issues and iteration instead of decided up front. One first feature and two anchors give that exploration a direction.

## The first feature

**Leaders see the participants in their units.** A leader signs in with ScoutID and gets their own unit's people – who they are, how to reach them, and what a leader needs to know about each of them. It comes first because everything after it reads from it: a status report is about a unit, and an issue is usually about a person.

## The two anchors

**Status reporting.** During camp the contingent management needs to know how each unit is doing without walking a 300-hectare camp or chasing 53 leaders in a chat. A leader answers for their unit, the answers land in one place, and the picture is current rather than reconstructed at the evening meeting.

**Lightweight issue tracking.** Something comes up – a scout with a fever, a bag on the wrong bus, a leader who needs relief – and it needs an owner and a state, not a thread that scrolls away. The health team is the clearest example of a function that would use it.

Neither anchor is specified. Both are named here because they are where Campfire is aimed after the first feature: when either is picked up, its requirements are written against the issue, the way [Process](../process/) describes.

## What version 1 is made of

- **Four feature modules.** `authentication` signs a person in and out through the auth service, `home` owns the start screen with the contingent's notices and emergency numbers, `journey` knows the trip's dates and puts a countdown on that screen, and `participants` holds the contingent's list of participants – its list and detail screens. The web application composes them in one place, and none of them imports another ([Modules](../architecture/modules)).
- **A design system.** The tokens, the five unit themes, the display face, and the components built on them, cataloged in Storybook ([Design](../design/)).
- **Two shells that host the application.** The Apple and the Android shell each open the one origin in a webview, draw the native navigation bar and tab bar, and carry the sign-in round trip in a modal, with the origin they load carried in a build setting ([Applications](../architecture/applications)).
- **A seeded mock that answers as both services.** `tools/mock` serves the sign-in contract behind a persona picker and the list of participants behind the real service's gates, under the prefixes the deployed ingress serves ([The mock back-end](../testing/mock)).
- **The whole toolchain.** The checks, the tests, the GitHub Actions workflows, the three environments behind one origin, this guidebook, the decision log, and the C4 model the diagrams are rendered from.

## What Campfire does not do

- **It is not the contingent's communication channel.** Discord is where the contingent talks, before and during camp, and Campfire does not integrate with it. Duplicating a channel that already works would split the conversation in half.
- **It is not the system of record for the list of participants.** The people, the units, and the roles are the contingent's own data, kept where the contingent keeps it. Scoutnet is where that data lives ([Scoutnet](../context/systems/scoutnet)), and Campfire reads what the participants service publishes from it.
- **It is not the jamboree's program.** The camp, the subcamps, and the activities are ZHP's and WOSM's to run. Campfire is the Swedish contingent's own tool alongside them.
- **It is not for participants.** A tool aimed at 14-to-17-year-olds is a different product with different rules, and building one is not on the table.

## How scope is decided

Every change starts as a GitHub issue – a feature, a bug, or a task – created from the templates in `.github/ISSUE_TEMPLATE/`. A feature names its audience from the same nine people the architecture model draws, so an issue and the diagrams talk about the same groups rather than two overlapping sets.

From there the work moves through the four agents with a human gate at every step: the analyst details the issue into requirements, the architect turns those into a design, the developer plans and builds it, and the reviewer reads the result. [Process](../process/) describes the flow. The requirements written along the way are per-branch scratch – the durable record is the issue, the decisions, this guidebook, and the code.

## What is still open

- **The feature set beyond the first feature and the two anchors is unwritten.** Campfire is expected to grow past status reporting and issue tracking, and what it grows into is not decided.
- **What the list of participants carries is the service's call.** The people in the mock are invented, and what the participants service publishes – in what shape, at what level of detail, and to whom – is that service's to decide rather than this repository's ([ADR 013](/decisions/013-build-the-back-end-as-python-services-in-their-own-repositories)).
- **Distribution is open.** Whether the shells reach phones through the public stores, TestFlight, or managed distribution is undecided ([ADR 010](/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells)), and [Release](../maintenance/release) says what that leaves unfinished.
