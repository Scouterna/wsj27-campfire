# Unit tests

Unit tests cover the logic that needs no running application: pure functions, the boundaries where untyped input arrives, and each package's public surface. They live beside the code they cover – `string.test.ts` sits next to `string.ts` – and they are written with it, so a package lands with the tests that prove it.

## TypeScript, with Vitest

`pnpm test` runs every TypeScript test in the repository through Vitest, configured in `config/vitest/vitest.config.ts` ([ADR 022](/decisions/022-test-typescript-with-vitest)).

That configuration lists one project per package that has tests, written out by hand:

| Project          | Package                  | What it covers                                                         |
| ---------------- | ------------------------ | ---------------------------------------------------------------------- |
| `utils`          | `libraries/utils`        | `stringOrFallback`, the `fetch` wrapper, and the role helpers          |
| `ui`             | `libraries/ui`           | The theme names and checks, and the unit-to-theme table                |
| `host`           | `libraries/host`         | Tier detection from the User-Agent, and its answer with no `navigator` |
| `authentication` | `modules/authentication` | The session client, the role translation, and the DTO converters       |
| `home`           | `modules/home`           | The message list, which of it is unread, and reading what was closed   |
| `journey`        | `modules/journey`        | The trip's phase and countdown, pure functions over its fixed dates    |
| `participants`   | `modules/participants`   | The unit identity table and the DTO converters                         |
| `mock`           | `tools/mock`             | [The mock back-end](./mock) itself – its routes, through `createApp()` |

Hand-listing is the point. A new package with tests is a new entry here, deliberately, rather than a glob that silently starts matching – or silently stops. Every project runs in Node and picks up `src/**/*.test.ts`; `libraries/ui` runs in Node too, rather than in a DOM, because its components are proved in Storybook instead ([ADR 023](/decisions/023-catalog-the-ui-in-storybook)).

### The coverage ratchet

`pnpm test` measures coverage on every run and fails below the floor each metric carries: 97% of statements, 91% of branches, 99% of functions, and 97% of lines. The numbers are a ratchet rather than a target: each sits just under what the suite achieves, so a change that stops covering something fails, and a change that covers more is followed by raising the bar to just under the new figure.

What it measures is deliberately narrow – `libraries/host`, `libraries/utils`, and `tools/mock`, minus the mock's `main.ts`, which starts a server and has no behavior of its own to assert, and minus the utils package's one component, `RolesProvider.tsx`. Components and screens stay outside the denominator on purpose, because they are proved by Storybook and by the [Playwright walk-throughs](./ui) rather than by a rendering test.

## Swift, on a Simulator

`pnpm test:apple` runs the `CampfireTests` target through `scripts/apple/test.sh`: Swift Testing, always the Local scheme, on a Simulator the script resolves for itself.

The suite is hosted by the application, so `Config` reads the real generated Info.plist rather than a fixture, and `ConfigTests` asserts that the whole chain – an xcconfig, the generated plist, and the Swift that reads it – actually delivers an origin. It asserts that the origin is read rather than what it is, which is why the other two environments have nothing of their own to prove here.

An `xcodebuild test` run builds every test target in the scheme, so a unit-test run also compiles the walk-through. That is what keeps the [UI test](./ui) from rotting between the occasions anybody runs it.

## Kotlin, on the JVM

`pnpm test:android` runs `testLocalDebugUnitTest` – JUnit 5 against the local flavor – plus `assembleLocalDebugAndroidTest`, which compiles the instrumented suite without running it, for the same reason.

The suite mirrors the Apple one by name, because the shells mirror each other by design ([ADR 010](/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells)): `ConfigTests` asserts that the product flavor, the generated `BuildConfig`, and the Kotlin that reads it deliver `http://localhost:8000` – the local ingress on the adb-reversed localhost.
