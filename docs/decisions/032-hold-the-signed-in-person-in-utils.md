# 032. Hold the signed-in person in utils

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-18" /></p>
:::

## Context

[ADR 016](016-compose-the-web-application-from-feature-modules.md) keeps modules from importing each other, and sends a fact two of them share "through the application as a prop." That works for a value and fails for a decision. To hand a module a finished answer, the application has to work the answer out, and a composition root that computes is a fifth module that may import all the others – the thing ADR 016 exists to prevent.

The journey countdown showed it. Whether the signed-in person is on the pre-trip is the authentication module's fact and the journey module's question, and the logic joining them had nowhere to live but `apps/web`. The roles never had the problem: they are ambient in `utils`, and no module has needed one threaded to it.

## Decision

We hold the signed-in person in `libraries/utils`, ambient beside the roles, and the application computes nothing on a module's behalf.

- **`User` is `utils`' type**, read anywhere below the session gate with `useUser`. Any module may ask who is signed in; none imports the module that found out.
- **The authentication module still fills it in**, whole and with its derivations – the unit, the travel choice, the role line, the mark. A new fact about the person is a new field on `User`, never a new provider and never a value the application derives.
- **A screen's logic lives in the screen's module.** When a module cannot reach a hook it needs, the hook moves to a library; the logic does not move up into `apps/web`.
- **The composition root only joins**: it spreads the modules' tables, mounts the providers, and translates the `User` into types `utils` cannot import – `ui`'s theme, the participants module's `Viewer`.

This supersedes two statements in ADR 016 – that a shared fact travels as a prop, and that the signed-in user is a shape each module writes for itself – and leaves the rest standing.

## Consequences

- A module's dependence on a session fact is a `useUser` call inside the module, no longer a line in the one file everybody reads.
- `utils` now names the contingent's own words – `rundresa`, a Swedish role line – and fails the portability test for a library. The exception is the session's vocabulary and nothing else: a participant, a unit's people, and the trip's dates stay in their modules. That bound is all that keeps `utils` from becoming the `core` library ADR 016 rejected.
- `User` grows with every fact a module wants about the person, and the converter's tests are where each field is proved.
- `useRoles` is now a second way to read `useUser().roles`. It stays, because a story mounts a bare role list more cheaply than a whole `User`.

## Alternatives considered

- **Keep threading props through the composition root.** Every coupling stays on one page, and the logic that produces each prop ends up in the application.
- **A provider per fact**, such as a travel provider beside the roles. The fact is already a field on `User`, so it is a second road to the same place, and the next fact wants a third.
- **Keep `User` in the authentication module and export `useUser` from there.** No other module may import authentication, so none could call it.
- **A separate `session` library**, leaving `utils` portable. The cleaner cut, at the cost of one more package in seven hand-written lists for two small types. It is the move to make if the session's vocabulary keeps growing.
