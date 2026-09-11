# 013. Build the back-end as Python services in their own repositories

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

The front-end is whole: one web application in two shells ([ADR 010](010-deliver-the-front-end-as-one-web-application-in-native-shells.md)), served on one origin ([ADR 012](012-run-campfire-in-three-environments-on-one-origin.md)), with a mock standing in for everything behind the back-end paths. Every screen that shows real data depends on services this repository does not hold, and [ADR 004](004-build-on-pnpm-and-typescript.md) left the back-end out of the baseline on purpose.

One service already exists. `wsj27-auth-api` handles the sign-in round trip, lives in its own repository, and is consumed by `config/environments/dev/compose.yaml` as a container built from there. So the question is not whether Campfire has a back-end, but what language its services are written in and where their code lives.

## Decision

We build the back-end as Python services, one repository per service, outside this monorepo.

- **This repository is the front-end and the product's shared ground** – the web application, the shells, the libraries and modules, the mock, the tooling, the decisions, and the guidebook. `wsj27-auth-api` is the first service and the shape every later one follows; `wsj27-project-api`, the participants service, is the second.
- **A service owns its repository, toolchain, checks, and release cadence.** Nothing about a service's internals is decided here; those decisions are recorded with the service.
- **This repository consumes a service as a container, never as source.** The environments name it, build it, and route to it at its prefix under `/api/`, so the web application and the shells keep knowing exactly one address.
- **Python, because it is the language these services are written in** by the people who write and keep them.

What this does not decide: the web framework, the data stores, how many services there are, how they talk to each other, or where their schemas live. Those are settled in the service repositories as each service takes shape.

## Consequences

- Campfire is two languages and several repositories, and nothing is shared automatically. A DTO exists once in Python and once in TypeScript, kept in step by hand and by the mock, and a change that spans the boundary is two pull requests, in order.
- No single clone gives you the whole system. `config/environments/` assembles it, and adding a service means an entry in each compose file and a route in each front door.
- A cross-cutting change is expensive on purpose. That is the price of the front-end shipping on its own schedule, which is the force behind ADR 010, and the services get the same freedom.
- [ADR 005](005-pin-every-dependency-and-let-new-releases-age.md)'s supply-chain policy is a pnpm mechanism and does not reach Python. Each service repository states its own.
- The mock is the front-end's only picture of services it cannot see, and it will drift. The first drift that bites is the signal to publish the contract rather than describe it twice.
- The decision log stays here. A decision that shapes the product is recorded in this repository even when the code it shapes is not.

## Alternatives considered

- **The Python services in this monorepo.** One clone, one review for a change that spans the stack. Everything that makes this repository work is Node-shaped – the workspace, the lockfile, the checks, the hooks, the workflows – and a Python service would either be ignored by all of it or force a parallel toolchain into every one.
- **A TypeScript back-end, one language for the whole product.** The strongest alternative: shared types, one toolchain, and the mock could have grown into the first service. Those benefits come from sharing a repository, not a language – once the services live apart, the types are copied either way – and it would pick the language that suits the front-end over the one the back-end work is written in.
- **One repository for the whole back-end.** Fewer repositories to keep current. The auth service already exists on its own, and if services multiply faster than they earn a repository each, this is the alternative to revisit.
- **A hosted platform, such as Supabase or Firebase.** Authentication, a database, and an API in an afternoon. The data is Scouterna's member data, sign-in belongs to the movement's own identity provider, and where that data rests should not be a side effect of a convenience.
- **The mock as the back-end.** It works today for everything it invents, and it cannot hold real participant data, cannot be trusted with a session, and resets on restart.
