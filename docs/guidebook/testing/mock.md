# The mock back-end

Campfire's real back-end is services in their own repositories ([ADR 013](/decisions/013-keep-the-back-end-services-in-their-own-repositories)), and reaching them takes Docker, credentials, and an identity provider that is up. Almost every screen also depends on who is looking, so trying one against the real services takes an account per role. The mock in `tools/mock` removes all of that on a developer's machine: a small server that answers as the real services do, seeded with invented people, so local work and the walk-throughs never touch a network ([ADR 021](/decisions/021-develop-against-a-mock-back-end)).

It copies what the services' code does rather than inventing behavior – the same routes, response bodies, refusals, and cookies, at the same paths the deployed environments serve. The web application only fetches paths on its own origin, so neither it nor a shell can tell the mock from the real thing, and an address that works locally works against dev unchanged ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)).

## What it stands in for

In the local environment, Caddy serves everything on `http://localhost:8000`, sending the back-end paths to the mock and every other path to Vite ([The environments](../development/environments)).

| Under               | Stands in for                                                                      |
| ------------------- | ---------------------------------------------------------------------------------- |
| `/api/auth`         | The auth service – sign-in, the session cookies, and a real signed access token    |
| `/api/project`      | The participants service – the list of participants, scoped by the caller's roles  |
| `/__mock__/scoutid` | ScoutID, with a persona picker where the password form would be                    |
| `/__mock__`         | The mock's own controls – forgetting every session, and reporting who is signed in |

ScoutID is the one part that is not a copy, because it is not ours to run. The auth service sends the browser there as it would to the real ScoutID, and the page that answers lists invented people instead of asking for a password. Tap a name and the browser returns through the auth service with a code, exactly as it does from the real sign-in.

Access follows the real rules. A unit leader reads their own unit and nobody else's. The contingent management team reads everyone, and sees health answers only through a health role or a personal grant – a request without one is refused, never quietly answered with less. Someone with no access gets the same 404 as a person who does not exist, so a refusal never reveals who is on the list.

Nothing reaches disk, and the signing key is made at start, so restarting the mock signs everyone out. The access token lasts the real service's five minutes rather than something longer and kinder, so the refresh path runs during an ordinary afternoon of local work rather than only in production.

## The personas

Each persona is an invented person, there for a case the access rules turn on rather than to fill the list:

- a leader in each of two units, so a view that leaks from one unit to the other shows
- the head of contingent and a member of each management function
- the edges – a member who reads health answers through a personal grant rather than their function, a management member whose function is not mapped, and someone signed in from outside the contingent, who is refused everything

The picker shows each one with a line on what signing in as them demonstrates, so "what does someone on the health team actually see" is answered by tapping a name.

A persona holds no roles of their own. The mock mints them from the person's row in the list of participants, the way the participants service does, and the auth service puts them in the token. Behind the personas is the list of participants itself, invented too: each row earns its place by carrying something the others do not – an allergy, a medication, a diagnosis, incomplete vaccinations, a leader's record full of holes. The holes are deliberate, because a real list has them. The units are numbers and nothing more, as they are to the real service; their names and marks are the web application's own.

## Using it

```bash
pnpm start:local   # the whole local environment, mock included, on http://localhost:8000
pnpm start:mock    # the mock alone, on port 8003, when the mock is what you are changing
```

Sign-in works only through `http://localhost:8000`, the address the auth service's settings name, so the mock alone is for working on the mock rather than on the application. The mock ScoutID keeps a session of its own, as the real one does, so signing in again goes straight through without the picker – sign out to switch persona.

## Its own tests

The mock is a package like any other, with unit tests beside its source. They drive its routes in process with a browser that keeps cookies and a clock moved by hand, so a test can age an access token past its five minutes and watch the session recover.

A stand-in that drifts from the real contract is worse than none, so the contract is asserted rather than assumed, down to the exact bytes the services send: the sign-in round trip and every cookie it sets, every access rule on the list of participants, and the 404 that hides a person. That is also why the mock is inside the [coverage ratchet](./unit).
