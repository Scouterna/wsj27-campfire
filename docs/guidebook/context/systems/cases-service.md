# Cases service

The cases service keeps follow-ups: a case about a person or a unit, and the notes written on it over time. It is a service of its own beside the [participants service](./participants-service), built and released outside this repository ([ADR 013](/decisions/013-keep-the-back-end-services-in-their-own-repositories)), and it accepts the same session the [auth service](./auth-service) issues. Campfire reaches it under `/api/project/cases` on its one origin ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)). It keeps its cases in a database of its own, which the [dev environment](../../development/environments) runs beside it.

## What Campfire uses it for

- **Listing cases** – the open ones newest first, and the closed ones on request.
- **Opening a case** about a person, under a title, of a type and at a secrecy level the creator chooses.
- **Learning which types a person may open** – the service's own answer, because it follows their roles.
- **Renaming an open case.**
- **Sharing a case** with named leaders and members of the management team, by its type's role holders, and never with someone who sees it already – a unit's case only with the unit's other leaders while it is private, and a CMT case with the leaders of its person's unit.
- **Reading and writing notes** – a case's thread, newest first, and a new note on an open case, kept from some of those who see the case where its writer chooses.
- **Closing and reopening** – closing records who did it and when, and reopening clears both.

There is no read for one case, so Campfire finds a case in the list. Every read of a case's notes is logged by the service, with who read them and when, and a note can be neither edited nor deleted. The cases module is the only part of Campfire that calls it.

## Who may see what

Three things decide who reaches a case, and the service enforces all of them:

- **Its type**, each with the role it needs – a health case the health team's role, a management case any role in the contingent management team, and a unit's case a leader of that unit. A person whose roles give no type at all is refused every case route.
- **Its secrecy level**, fixed when it is opened – at the default, everyone the type's role reaches and anyone it is shared with; one level up, the role alone, and it can never be shared; at the top, its creator alone and anyone they share it with.
- **Its extra-access list**, the named people it is shared with, who may do what a role holder may except share it further.

A note can be more secret than its case, down to its author alone. A case the caller does not reach answers exactly like one that does not exist, and a list holds only the cases the caller reaches, so Campfire shows whatever the service answers. Campfire offers the cases section to whoever holds a case type – the management team and the leaders of a unit – mirroring the service's rule rather than standing in for it. A personal health grant opens health answers in the [participants service](./participants-service) but no health case.

## Locally

In the [local environment](../../development/environments), the [mock](../../testing/mock) answers in its place with a few seeded cases and the same routes, kept in memory for as long as it runs ([ADR 021](/decisions/021-develop-against-a-mock-back-end)).
