# 023. Catalog the UI in Storybook

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

Every screen a user sees is in the web application ([ADR 010](010-deliver-the-front-end-as-one-web-application-in-native-shells.md)), so the interface is not a layer of the product – it mostly is the product. `libraries/ui` holds the design system, and the feature modules build screens and widgets on top of it ([ADR 016](016-compose-the-web-application-from-feature-modules.md)).

Most of what needs looking at cannot be reached by running the app. A participant with three allergies and a rare diet, an empty unit, a request that never returns, a request that is refused – each is a state somebody has to see before shipping it, and each takes a specific person, a specific seed, and a specific failure to reproduce. The five color identities multiply that: a component that reads well in blue can be unreadable in yellow, and checking it by signing in as five leaders is not a thing anyone will do twice.

## Decision

We keep one Storybook for the whole monorepo, configured in `config/storybook/` ([ADR 006](006-lint-and-format-with-a-shared-strict-toolchain.md)).

- **It indexes the design system and the modules together.** A story sits beside the thing it documents, as `Name.stories.tsx`, in `libraries/ui` or in a module.
- **The sidebar reads as the design system does** – Introduction, Foundations, Components, then Modules – rather than alphabetically.
- **A theme switcher in the toolbar carries all five themes**, so every story is checked in each of them without leaving the page.
- **Nothing in Storybook touches a network.** A story that needs data declares it, and a decorator seeds a fresh query cache and stubs `fetch` for the paths it names. A pending and a refused request are states a story asks for.
- **The build is a check.** `pnpm build:storybook` runs on every pull request that touches the web ([ADR 009](009-check-and-release-with-small-github-actions-workflows.md)), so a story that stops bundling fails the pull request.
- **The catalog wears the guidebook's look** – one theme file gives the manager and the Docs pages the guidebook's colors, type, and icon, so the two sites this repository publishes read as one project.
- **Props documentation comes from the types**, so a documented prop and a real prop cannot drift apart, and **telemetry is off**.

## Consequences

- Every component is two files, and nothing enforces the second one. A component added without a story is a hole in the catalog no check will find.
- Storybook is a large dependency with a fast release cadence, pinned across several packages that move together under [ADR 005](005-pin-every-dependency-and-let-new-releases-age.md). It never reaches a user, and a major version is still a day's work when it lands.
- Continuous integration proves the stories compile, not that they look right. Nobody sees a rendered story on a pull request, so a change that quietly breaks a layout in yellow ships. Visual regression testing is the obvious next thing, and it does not exist.
- A story's data is a second vocabulary for describing the register, beside the fixtures the unit tests use. Keeping the two plausible is manual, and a story showing a person nobody could be is a real failure mode.
- The catalog is the closest thing the project has to a pattern library, and it will be read as one. A component in the catalog looks blessed, even when it was built for one screen.
- No component or DOM tests exist ([ADR 022](022-test-typescript-with-vitest.md)), so this is where rendering is verified by eye, and the browser walk-throughs are what verify it automatically. That is a thin layer, and naming it is better than pretending the tests cover it.

## Alternatives considered

- **Ladle.** Far lighter and Vite-native. It gives up the generated docs pages, the props tables, and the addon ecosystem, and has a much smaller community to inherit answers from. Storybook's weight is in the toolchain, not the bundle.
- **A demo route inside the application.** No dependency, and the real components in the real stylesheet. It would grow its own theme switcher, its own fake data plumbing, and its own navigation – a worse version of a tool that exists – and ship inside the application leaders install.
- **Nothing: run the app and look.** It cannot reach the states worth checking, cannot show five themes in five seconds, and puts every visual review behind a sign-in.
- **Component tests instead of a catalog.** They would catch a structural regression a reviewer misses, which Storybook never will, and they show nobody anything. What a component looks like in brown, with a long Swedish name, is not a thing an assertion answers. Both are wanted; the catalog came first because it serves design and development at once.
