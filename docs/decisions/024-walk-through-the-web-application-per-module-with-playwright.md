# 024. Walk through the web application per module with Playwright

::: info Status
<p><Badge type="tip" text="Accepted" /> <Badge type="info" text="2026-09-15" /></p>
:::

## Context

[ADR 022](022-test-typescript-with-vitest.md) tests the logic and leaves the screens to the catalog ([ADR 023](023-catalog-the-ui-in-storybook.md)), which catches only what someone opens. A screen is mostly composition – a role deciding which cards appear, a route resolving a title, a widget resolved by id ([ADR 016](016-compose-the-web-application-from-feature-modules.md)) – and rendering it in jsdom passes while the real application shows a blank page because a route was never registered. Only a browser driving the real application settles that.

A walk-through needs a large browser download and a development server, and running every module's on every pull request is how a suite becomes one nobody waits for. What is worth testing in a shell is platform behavior, and nothing about which screens exist.

## Decision

We give each feature module its own Playwright walk-through, and test the shells with their own platform's tools.

- **Playwright drives the web application in a real browser**, configured once in `config/playwright/` ([ADR 006](006-lint-and-format-with-a-shared-strict-toolchain.md)), against the local environment `pnpm start:local` runs – the web application and the mock behind one origin on port 8000.
- **One Playwright project per module**, its specs in `modules/<name>/test-ui/` – the name both shells use for suites that drive a running application.
- **A module's walk-through runs only when the pull request could change what it proves** – that module, the web application, a library, or the tooling. The filter is inside the job, because a job skipped by `on: paths:` reports no status and a required check waits forever ([ADR 009](009-check-and-release-with-small-github-actions-workflows.md)).
- **Chromium alone**, because the question is composition, not engines.
- **The shells' suites never assert a screen.** XCTest and XCUITest on Apple, JVM and Compose instrumented tests on Android, assert what makes a shell a shell.

## Consequences

- A screen is proven by something that catches the real failures – an unregistered route, a widget id nothing contributes, a blank render.
- The modules are listed in the Playwright configuration and in the workflow matrix, and a module in one and not the other runs nowhere or fails.
- The change filter is generous on purpose, so the failure is running an unneeded walk-through, not skipping a needed one.
- The Apple suites run only on a developer's machine, with no macOS runner spent on the shell ([ADR 010](010-deliver-the-front-end-as-one-web-application-in-native-shells.md)), and the Android instrumented suite runs on demand, because a hosted emulator is slow and flaky.

## Alternatives considered

- One project for the whole application – a module's proof outside the module, and every screen paid for on every pull request.
- React Testing Library for the screens – a jsdom render skips the routing and registration where the failures live.
- Firefox and WebKit beside Chromium – triple the minutes for a question about composition.
