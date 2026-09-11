# Introduction

This is the WSJ27 Campfire guidebook – the single place to understand what the system is, why it works the way it does, and where to read more. Whether you are a developer, a member of the contingent management team, or an agent about to make a change, start here.

## What Campfire is

Campfire is the digital companion for Scouterna's Swedish contingent to the World Scout Jamboree 2027 in Gdansk, Poland – the roughly 2,600-person delegation of participants, leaders, International Service Team, and contingent management traveling to the camp. Its users are the people running that delegation – the leaders and the contingent management team – not the participants.

It is one React web application, installable from the browser and hosted on phones by two thin native shells, Android in Kotlin and Apple in Swift. The application is composed from feature modules, each one domain's capability, and every screen a user sees comes from a module. The back-end is two Python services in repositories of their own – one for the session, one for the contingent's register – and the application holds no data and no identity of its own. In local work a seeded mock answers as both services against an invented register, so nothing touches a network ([The mock back-end](./testing/mock)).

The first feature is that leaders see the participants in their units. Status reporting and a lightweight way to track issues during camp are the anchors after it, and the feature set beyond those is discovered through issues and iteration rather than planned ahead.

## Built on decisions that are written down

The one firm commitment is that Campfire is built on architectural decisions, made explicitly and written down. That documentation – this guidebook and the Architecture Decision Records behind it – is the source of truth for both people and agents working in the repository.

Longevity is part of the reason. Campfire may well outlive this one event – reused for the next jamboree, a World Scout Moot, or another event with similar needs. When someone picks it up a couple of years from now, it should be easy to understand why it works the way it does.

The guidebook and the decision records work in opposite ways. The guidebook is living – it describes Campfire as its first version is built, and is rewritten whenever that design changes. The records never change: each is dated, and a choice that changes is superseded by a new record rather than edited, so the reasoning behind it survives intact.

## How to read the guidebook

The guidebook is organized into chapters, each covering one area. You can read it start to finish, but you do not have to – the chapter tree stays with you on every page, so you can jump straight to the area you care about, and search finds content across the whole guidebook.

The architecture diagrams are rendered from one C4 model under `docs/architecture/` rather than drawn by hand ([ADR 030](/decisions/030-model-the-architecture-as-c4-in-structurizr)), so a picture in the [Context](./context/) or [Architecture](./architecture/) chapter cannot quietly disagree with the text beside it.

## Chapters

- [Context](./context/) – what Campfire is, who it is for, and the systems it depends on.
- [Process](./process/) – the agent-driven workflow that carries work from a first need to implemented code.
- [Requirements](./requirements/) – what Campfire must do and the qualities it must meet.
- [Architecture](./architecture/) – the shape of the system: its applications, modules, layers, and how they fit together.
- [Design](./design/) – the visual design system: foundations, components, and the patterns built on them.
- [Development](./development/) – how to set up, build, and work in the repository.
- [Testing](./testing/) – how Campfire is tested and the checks that guard it.
- [Maintenance](./maintenance/) – how Campfire is released, run, and kept healthy over time.
- [Glossary](./glossary/) – the shared vocabulary used across the guidebook.
- [Decisions](/decisions/) – the Architecture Decision Records, the durable log of the choices behind Campfire.
