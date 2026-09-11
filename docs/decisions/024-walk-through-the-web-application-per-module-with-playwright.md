# 024. Walk through the web application per module with Playwright

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

[ADR 022](022-test-typescript-with-vitest.md) tests the logic and leaves the screens to be verified by eye in the catalog ([ADR 023](023-catalog-the-ui-in-storybook.md)) – fine for a screen a person is looking at, useless for one nobody thought to open. And the screens are the part a unit test is worst at. Almost all of a screen is composition – a page arranging cards, a role deciding which appear, a route resolving a title, a widget resolved by an id ([ADR 016](016-compose-the-web-application-from-feature-modules.md)) – and rendering one in jsdom tests the assertion, not the screen: it passes while the real application shows a blank page because a route was never registered. Only a browser driving the real application can settle whether a person can reach a screen and see what it is for.

A browser walk-through installs a browser of about a hundred megabytes and starts a development server, and doing that for every module on every pull request is how projects end up with one slow suite nobody wants to wait for. The shells pull the other way: everything about them worth testing is platform behavior – that the app launches, that it drew what it was told to, that its configuration reached it – and nothing about which screens exist is theirs.

## Decision

Each feature module owns its walk-through, and the shells are tested by their own platform's tools.

- **Playwright drives the web application in a real browser**, configured once in `config/playwright/` ([ADR 006](006-lint-and-format-with-a-shared-strict-toolchain.md)), against the same Vite server `pnpm start:web` runs – reusing one that is already up rather than fighting it for the port.
- **One Playwright project per module**, its specs under `modules/<name>/test-ui/` beside the screens they are about. `test-ui` rather than `test`, because that is what both shells already call the suites that drive a running application.
- **A module's walk-through runs only when the pull request could change what it proves.** The workflow runs one job per module, and each asks first whether the diff touched that module, the web application, a library, or the tooling. The filter is inside the job rather than in `on: paths:`, because a job skipped by a path filter reports no status and a required check waits on it forever ([ADR 009](009-check-and-release-with-small-github-actions-workflows.md)).
- **Chromium alone.** The point is that the screens work, not that they work in three engines.
- **Vitest's coverage is a ratchet rather than a target**, over the logic the screens stand on and nothing else. Components and screens are outside the include list, because what proves them is the walk-through.
- **The shells' suites are incurious about the screens.** XCTest and XCUITest on a Simulator, the JVM tests and the Compose instrumented suite on Android – they assert what makes a shell a shell, and never a screen's title or its content.

## Consequences

- A screen is proven by something that would have caught the real failures – a route never registered, a widget id nothing contributes, a screen that renders blank.
- The modules are listed twice – in the Playwright configuration and in the workflow matrix – and a module added to one and not the other either runs nowhere or fails outright. That is the cost of a matrix a workflow cannot read from a TypeScript file.
- A pull request touching one module runs one walk-through, and the others report as passing in seconds. The change filter is a judgment about what could break a module, not a proof, and it is generous on purpose, so the failure mode is running a walk-through that was not needed rather than skipping one that was.
- The coverage numbers are not a quality score, and they will be read as one. They can sit in the nineties while the screens have no unit tests at all; the ratchet is what keeps that honest.
- The Apple suites run nowhere but a developer's machine, because no macOS runner is spent on the shell ([ADR 010](010-deliver-the-front-end-as-one-web-application-in-native-shells.md)), and the Android instrumented suite is on demand, because an emulator on a hosted runner is slow and flaky enough to cost more attention than it saves.

## Alternatives considered

- **One Playwright project for the whole web application.** Simpler configuration and no matrix to keep in step. It puts a module's proof outside the module, and every pull request pays for every screen.
- **Vitest and React Testing Library for the screens.** No browser, no server, seconds to run. The failures worth catching live in the composition – routing, registration, role resolution – and a jsdom render mounts the component directly, which is precisely the step that skips them.
- **`on: paths:` filters on the workflow.** The native way to express it, and a job skipped that way reports no status, so a required check blocks the pull request forever.
- **Driving the shells' webviews through the same Playwright suite.** The claims worth testing in a shell are exactly the ones outside the webview, where Playwright cannot reach.
- **A browser matrix – Firefox and WebKit beside Chromium.** It triples the minutes to answer a question about composition rather than rendering; the engine-specific half is better served by a person opening the app in Safari.
- **Raising coverage by including the components and screens.** A larger number, bought with assertions on markup rather than on behavior.
