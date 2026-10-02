# Cases service

The cases service keeps follow-ups: a case about a person or a unit, and the notes written on it over time. It is a service of its own beside the [participants service](./participants-service), built and released outside this repository ([ADR 013](/decisions/013-keep-the-back-end-services-in-their-own-repositories)), and it accepts the same session the [auth service](./auth-service) issues. Campfire reaches it under `/api/project/cases` on its one origin ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)). It keeps its cases in a database of its own, which the [dev environment](../../development/environments) runs beside it.

## What Campfire uses it for

- **Listing cases** – the open ones newest first, and the closed ones on request.
- **Opening a case** about a person, under a title.
- **Reading and writing notes** – a case's thread, newest first, and a new note on an open case.
- **Closing and reopening** – closing records who did it and when, and reopening clears both.

There is no read for one case, so Campfire finds a case in the list. Every read of a case's notes is logged by the service, with who read them and when, and a note can be neither edited nor deleted. The cases module is the only part of Campfire that calls it.

## Who may see what

The service refuses a caller with no WSJ27 role and admits every other – every unit leader, every member of the management team, and anyone holding a personal grant may list, read, write, close, and reopen every case. A case's type, secrecy level, and extra-access list are stored for an access model the service has not decided, and none of them restricts a reader yet. Campfire writes every case as a health case at the highest secrecy level and offers the section only to the health team, so the front-end's gate is what keeps the cases within the team. What the service will enforce is decided in its repository, and the gate follows it when it lands.

## Locally

In the [local environment](../../development/environments), the [mock](../../testing/mock) answers in its place with a few seeded cases and the same routes, kept in memory for as long as it runs ([ADR 021](/decisions/021-develop-against-a-mock-back-end)).
