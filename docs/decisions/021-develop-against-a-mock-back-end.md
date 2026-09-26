# 021. Develop against a mock back-end

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

The back-end services live in their own repositories ([ADR 013](013-keep-the-back-end-services-in-their-own-repositories.md)), and reaching them needs Docker, credentials, and someone else's identity provider to be up – none of it a fair price for changing a component, and none of it there on a train.

Almost every screen depends on who is looking – a unit leader sees their own unit, the health function sees everyone – and trying that against the real services takes an account and a sign-in per role. Nothing in the tests may touch a network either.

## Decision

We develop against a mock back-end in `tools/mock`, and make it the local environment's whole back-end.

- **It copies every back-end the front-end uses, at the back-end's own prefix**, answering as the service's code does – the same shapes, refusals, and cookies.
- **Sign-in goes through a mock ScoutID whose sign-in page is a persona picker** ([ADR 019](019-authenticate-on-the-app-origin-through-scoutid.md)), so any role is a tap away.
- **Its people are invented**, each chosen for a case the role rules turn on.
- **A new back-end is not done until the mock copies it.**
- **`tools/` holds what ships to nobody**, as a workspace root beside the apps, libraries, and modules ([ADR 002](002-organize-as-a-single-monorepo.md)).

## Consequences

- Local work and tests need no network, no credentials, and no accounts.
- Comparing a leader's view with the management's is a few taps rather than an account swap.
- Every contract has two implementations, copied by hand, and nothing checks that they agree. The first drift that bites is the signal to publish the contract rather than describe it twice.
- The mock is real code with no user, and competes for the same attention as the application.
- `dev` and `prod` never fall back to it, because a half-invented back-end would answer the question those environments exist for ([ADR 012](012-run-campfire-in-three-environments-on-one-origin.md)).

## Alternatives considered

- MSW in the browser – a worker cannot answer a full-page sign-in navigation, and the shells load the origin, not the bundle.
- Always developing against the dev environment – a network, credentials, and one shared dataset for everyone.
- The real services in local containers – the same credentials, and real members' data where invented data is wanted.
