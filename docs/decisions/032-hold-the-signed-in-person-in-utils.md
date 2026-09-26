# 032. Hold the signed-in person in utils

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-18" /></p>
:::

## Context

[ADR 016](016-compose-the-web-application-from-feature-modules.md) keeps modules from importing each other and sends a fact two of them share through the application as a prop. That works for a value and fails for a decision: to hand a module a finished answer, the application has to compute it, and a composition root that computes is a module that imports all the others.

Whether the signed-in person is on the pre-trip is the authentication module's fact and the journey module's question, and the logic joining them had nowhere to live but `apps/web`. The roles never had the problem, because they are ambient in `utils`.

## Decision

We hold the signed-in person in `libraries/utils`, ambient beside the roles, and the application computes nothing on a module's behalf.

- **`User` is `utils`' type**, read anywhere below the session gate with `useUser`.
- **The authentication module fills it in**, whole and with its derivations. A new fact about the person is a new field on `User`, never a new provider or a value the application derives.
- **A screen's logic lives in the screen's module.** A hook a module cannot reach moves to a library; the logic does not move up into `apps/web`.
- **The composition root only joins** – it spreads the modules' tables, mounts the providers, and translates the `User` into types `utils` cannot import.

This changes course from ADR 016, where the signed-in person belonged to the authentication module and reached other modules as a prop.

## Consequences

- A module's dependence on a session fact is a `useUser` call inside it, not a line in the file everybody reads.
- `utils` names the contingent's own words and fails a library's portability test. The exception is the session's vocabulary and nothing else, which keeps `utils` from becoming a home for every domain type.
- `User` grows with every fact a module wants about the person.

## Alternatives considered

- Props through the composition root – the logic behind each prop ends up in the application.
- `useUser` exported from the authentication module – no other module may import it.
- A separate `session` library – the cleaner cut, for one more package in every hand-written list; the move to make if the vocabulary keeps growing.
