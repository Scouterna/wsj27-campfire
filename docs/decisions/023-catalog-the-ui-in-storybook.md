# 023. Catalog the UI in Storybook

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Every screen a user sees is in the web application ([ADR 010](010-deliver-the-front-end-as-one-web-application-in-native-shells.md)), so the interface mostly is the product. `libraries/ui` holds the design system, and the modules build screens and widgets on it ([ADR 016](016-compose-the-web-application-from-feature-modules.md)).

Most of what needs looking at cannot be reached by running the app. A participant with three allergies, an empty unit, a request that never returns, a refused one – each takes a specific person, seed, and failure to reproduce. The unit colors multiply that: a component that reads well in blue can be unreadable in yellow.

## Decision

We keep one Storybook for the whole monorepo, configured in `config/storybook/` ([ADR 006](006-lint-and-format-with-a-shared-strict-toolchain.md)).

- **It indexes the design system and the modules together**, with each story beside what it documents as `Name.stories.tsx`.
- **A theme switcher in the toolbar carries every unit theme.**
- **Nothing in Storybook touches a network.** A story declares its data, and a decorator seeds a fresh query cache and stubs `fetch` for the paths it names, so a pending or a refused request is a state a story asks for.
- **The build is a check** on every pull request that touches the web ([ADR 009](009-check-and-release-with-small-github-actions-workflows.md)).

## Consequences

- Every component carries a story beside it, and nothing finds one that doesn't.
- Storybook is a large, fast-moving dependency, pinned across packages that move together under [ADR 005](005-pin-every-dependency-and-let-new-releases-age.md), and never reaches a user.
- Continuous integration proves the stories compile, not that they look right, so a layout broken in yellow can ship.
- A story's data is a second way of describing the list of participants, beside the tests' fixtures, and keeping both plausible is manual.
- A component in the catalog looks blessed, even when it was built for one screen.
- With no component tests ([ADR 022](022-test-typescript-with-vitest.md)), rendering is verified here by eye and by the walk-throughs.
