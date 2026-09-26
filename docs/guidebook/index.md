# Introduction

This guidebook describes WSJ27 Campfire – what it is, how it is put together, and why it works the way it does. It is written for anyone who picks the project up: a developer about to make a change, a member of the contingent management team curious about what the tool can do, or an agent working in the repository.

## What Campfire is

The 26th World Scout Jamboree is held from 30 July to 8 August 2027 on Wyspa Sobieszewska, an island in Gdansk, Poland. Scouterna sends a Swedish contingent of well over two thousand people: the participants, aged 14 to 17, traveling in units with their leaders, the adults of the International Service Team who work at the camp, and the contingent management team that runs the whole delegation. For the contingent the trip is longer than the camp – either a round trip through Latvia and Lithuania or a direct journey by way of Olsztyn, and then home in August.

Campfire is the contingent's digital companion, and it is for the people running the contingent rather than the participants. It gathers the work of leading the contingent in one place, from the year of preparation through the trip and the camp to the journey home. Leaders use it to know and reach their unit, report how it is doing, and raise what needs following up. The contingent management team uses it to see the whole contingent, follow up cases, and share information and material with the people who need it. What each person sees follows from who they are in the contingent, and what is in scope is kept in [Scope](./requirements/scope).

## What it is built of

Campfire is one React web application. It runs in any browser, installs from there, and is hosted on phones by two thin native shells – Android in Kotlin and iOS in Swift – that draw the native navigation and tab bars around it. Every screen is built once, in the web application, so a fix reaches every phone in one web deploy instead of waiting on a store review ([ADR 010](/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells)).

The application is composed from feature modules, each one domain's capability, such as the journey or the list of participants, over shared libraries, and no module imports another ([ADR 016](/decisions/016-compose-the-web-application-from-feature-modules)).

Campfire holds no data and no identity of its own. People sign in with ScoutID, Scouterna's single sign-on, through the project's auth service, and the contingent's data comes from the WSJ27 project's back-end services – the list of participants, for one, which the participants service reads from Scoutnet. Those services live in repositories of their own ([ADR 013](/decisions/013-keep-the-back-end-services-in-their-own-repositories)). The application and the services answer on one origin, so the web application never needs to know which environment it runs in ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)). In local work a mock stands in for the back-end, with invented people and a persona picker for sign-in ([The mock back-end](./testing/mock)).

## Built on decisions that are written down

Campfire may outlive this one jamboree – reused for the next one, a World Scout Moot, or another event with similar needs – and whoever picks it up then should be able to understand why it works the way it does. So every significant choice is made explicitly and written down as an architecture decision record ([ADR 001](/decisions/001-record-architecture-decisions)).

The guidebook and the records work in opposite ways. A record is dated and never changes what it decided – a choice that changes gets a new record that supersedes it, so the reasoning behind the old one survives. The guidebook is living: it describes Campfire as it is designed now, and is rewritten whenever that design changes ([ADR 028](/decisions/028-keep-a-software-guidebook)). Where a page leans on a decision, it links the record, so the reasoning is one click away.

The architecture diagrams are rendered from one C4 model rather than drawn by hand, so a picture cannot quietly disagree with the model behind it ([ADR 030](/decisions/030-model-the-architecture-as-c4-in-structurizr)).

## How the guidebook is organized

Each chapter covers one area, and you can read them in any order – the chapter tree and search are on every page. Read from the top, they go from why Campfire exists to how it is kept running:

- [Context](./context/) – who uses Campfire and why, and the systems it depends on.
- [Process](./process/) – how work moves from a need to reviewed code, with AI agents drafting and humans deciding at every step.
- [Requirements](./requirements/) – what Campfire does, the constraints it is built inside, and the qualities it is held to.
- [Architecture](./architecture/) – the applications, the modules, and the layers, and how a request travels through them.
- [Design](./design/) – the design system: the foundations, the components, and the patterns built on them.
- [Development](./development/) – setting up the repository, running Campfire in its environments, and the checks every change passes.
- [Testing](./testing/) – what is tested and how, and the mock back-end the tests run against.
- [Maintenance](./maintenance/) – how each artifact is versioned and released, and how Campfire is monitored once it runs.
- [Glossary](./glossary/) – the words the guidebook, the decisions, and the code share, with the contingent's Swedish terms.
- [Decisions](/decisions/) – the decision records behind all of it.
