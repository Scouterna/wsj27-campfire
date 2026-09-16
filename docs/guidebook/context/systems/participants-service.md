# Participants service

The participants service – `wsj27-project-api` – is the one that answers `/api/project` with the contingent's list of participants: participant and role data derived from Scoutnet.

Like the [auth service](./auth-service), it is a Python service in its own repository, shipping as its own container image and released on its own cadence ([ADR 013](/decisions/013-build-the-back-end-as-python-services-in-their-own-repositories)) – which is why it is a system of its own rather than a part of Campfire. The dev and prod container environments build it from its repository's `main`, exactly as they build the auth service.

## What it does for Campfire

The list of participants, one troop at a time, with the caller's roles deciding how much of each answer comes back:

- `/api/project/participants/troopinfo/{troop}` lists one troop, or one member type – `al`, `ist`, and `cmt` are accepted shorthands. `/api/project/participants/individual/{memberNo}` answers for one person.
- Every request takes an information level – name, basic, or full. Basic carries the person and their contact answers; full adds the health and dietary answers, and needs a health grant.
- **It scopes its own answers.** A unit's leader reads their own troop at any level and nothing else; the contingent management reads everyone at basic, and full only with a health grant – refused with a 403 rather than quietly downgraded. No access at all answers 404, indistinguishable from a person who does not exist, so the list of participants does not leak who is in it.
- **It owns the role model.** `/api/project/participants/roles` serves the finished member-to-roles map that the [auth service](./auth-service) mints into tokens: `wsj27:al:<troop>` for leaders, `wsj27:cmt:<funktion>:<roll>` for the management – the funktion split read from the contingent's own mapping, not from Scoutnet – and per-person `wsj27:access:<level>` grants. The auth service reads it with a service token of its own carrying the `wsj27:bulkread` role.

[Applications](../../architecture/applications) has the rest of the contract.

## Who talks to it

The [participants module](../../architecture/modules) is the only part of the application that calls `/api/project`, and every other module that needs a fact from the list of participants gets it as a prop or through a named doorway. The service has no "everyone I may see" endpoint, so the client composes the list of participants from the troop listings – a leader asks for their own troop, and the management walks the troops the leaders' listing names. The auth service calls the roles endpoint on a timer.

Outward, it is the one system that reaches [Scoutnet](./scoutnet).

## Where its data comes from

Scoutnet. The service fetches the WSJ27 project's participants, forms, and answers from Scoutnet's project API, decodes the raw form answers into a stable, keyed structure, and caches the result – in the container environments on a volume of its own, so it can start from disk when Scoutnet is slow or unreachable. What it publishes is decided by a hand-maintained template in its repository: a question the template does not carry never leaves the service, which is why a screen built for an answer may have nothing to render until the template grows.

## What stands in for it locally

The [mock](../../testing/mock) copies the service's behavior – the endpoints, the information levels, the role minting, and the 403 and 404 semantics – against a seeded list of twenty-three people: two units of leaders, deltagare, and IST, plus the contingent management ([ADR 021](/decisions/021-stand-in-for-the-back-end-with-a-seeded-mock)). It holds the service's form template question for question, and its seed carries a few answers the template does not publish, which never leave the mock either.

Because the list of participants comes from a separate service that will change shape over an eighteen-month build, the front-end validates every field at the boundary and drops a bad row rather than trusting it.
