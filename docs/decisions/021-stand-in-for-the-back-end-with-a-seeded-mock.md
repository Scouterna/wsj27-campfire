# 021. Stand in for the back-end with a seeded mock

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Campfire's back-end is Python services in their own repositories ([ADR 013](013-build-the-back-end-as-python-services-in-their-own-repositories.md)) – two today, more as the feature set grows – and none of them is free to use during development: reaching them needs Docker, a client secret, Scoutnet project keys, and someone else's Keycloak realm to be up. None of that is available on a train, and none of it should be a prerequisite for changing a component.

The reason that matters more is who is looking. Almost every interesting screen depends on it – a unit leader sees their own unit, the health function sees everyone – and exercising that against a real provider means three accounts and three sign-ins. Exercising it against something we control means tapping a name. And nothing in the test suite may touch a network: a test that reaches out fails on a plane and passes in review.

## Decision

We build a mock back-end inside this repository, at `tools/mock`, and make it the local environment's entire back-end – a copy of every service the front-end depends on, at the service's own prefix.

- **`tools/*` is a fourth workspace root**, beside `apps/*`, `libraries/*`, and `modules/*` ([ADR 002](002-organize-as-a-single-monorepo.md)), for what is neither shipped to a user nor imported by something that is.
- **Hono on Node**, reached only through the environment's front door, started by Node running the TypeScript directly, so the mock has no build step.
- **It copies `wsj27-auth-api` under `/api/auth`, route for route**, with a stand-in for ScoutID behind it under `/__mock__/scoutid`, because ScoutID is the one part that is not ours to copy. The stand-in's sign-in page is a persona picker: tap a name, no password ([ADR 019](019-authenticate-on-the-app-origin-through-scoutid.md)). The session details match the real service – the same cookies, a short-lived signed access token, a refresh window – so the application's refresh recovery is exercised here rather than skipped until dev.
- **It copies `wsj27-project-api` under `/api/project`**, with the real info levels and the real gates. No access answers 404, indistinguishable from a member number that was never there, so the register does not leak who exists; too little access answers 403 rather than a quietly downgraded 200.
- **A new service is not done until its copy is here.** The first screen that reads from a service has the mock to run against, at `/api/<service>`, before the local environment can show it.
- **The data is seeded, one file per person** – twelve personas across two units, each chosen for a case the role rules turn on, over a register the personas' roles are minted from by the service's own rules.
- **A control surface lives at `/__mock__`** – reset and state – namespaced so it can never collide with a path a real service might want.
- **The mock is tested like everything else**, as its own project in `pnpm test`.

## Consequences

- Two implementations of every contract, and nothing checks that they agree. The contract is defined in the service repositories and copied here by hand – endpoints, payload shapes, role strings, refusal semantics – and the first drift that bites is the signal to publish the contract rather than describe it twice.
- Signing in as any of twelve people takes a few taps, so comparing a leader's view with an admin's is seconds rather than an account swap.
- Sessions live in memory and the signing key is made at start, so restarting the mock signs everyone out – what tests want, a small annoyance in development, and what makes sign-out the reset button.
- The mock is real code with no user, and it competes for the same attention as the application.
- `dev` and `prod` do not fall back to it. A back-end that is half real and half invented answers the one question those environments exist to ask, wrongly ([ADR 012](012-run-campfire-in-three-environments-on-one-origin.md)).
- A fourth workspace root is one more place every new package has to be listed – in the dev environment's mask list and the image's copy list.

## Alternatives considered

- **Mock in the browser, with MSW.** The same handlers in the app and in tests, and no server to run. Sign-in is a full-page navigation to a service that sets cookies and redirects, which a worker inside the page cannot answer, and it does nothing for the shells, which load the origin rather than the bundle.
- **Fixtures in the tests, and no server.** What the DTO tests already do. It covers the decoders and nothing else – no cookies, no refresh, no scoping – and leaves the application with nothing to run against.
- **Always develop against the dev environment.** No second implementation to drift. It needs network, credentials, and someone else's realm, and puts every developer in one shared dataset. `pnpm start:dev` remains, for the one thing the mock cannot do.
- **Record real responses and replay them.** The register is real people's member data, health answers included, and a recording of it must never sit in a repository. Invented seeds in the real shape are the version of this that is allowed to exist.
- **Run the real services in containers locally.** It needs the same credentials and realm nobody carries on a train, serves real data where invented data is wanted, and the persona picker would still be wanted afterwards.
