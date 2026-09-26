# Unit tests

Unit tests cover the logic that needs no running application: pure functions, the boundaries where untyped input arrives, and each package's public surface. Nothing renders a component. A screen is mostly composition, and a render in a fake DOM passes while the real application shows a blank page, so the [walk-throughs](./ui) and [Storybook](../design/) prove the screens instead ([ADR 024](/decisions/024-walk-through-the-web-application-per-module-with-playwright)).

## TypeScript

`pnpm test` runs every TypeScript test through Vitest, in Node with no DOM ([ADR 022](/decisions/022-test-typescript-with-vitest)). Vitest shares Vite's transform, so the application, its tests, and the catalog agree on how TypeScript becomes JavaScript.

The configuration in `config/vitest/` lists each package that has tests as a project of its own, by hand. A new package with tests is a new entry, added on purpose, rather than a glob that silently starts matching – or silently stops.

| Where                    | What its tests prove                                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| The libraries            | The shared helpers, the role checks, the themes and transitions, and which host the page runs in                                             |
| `modules/authentication` | The session client, the session's expiry, the user's roles, and the DTO converters                                                           |
| The other modules        | Their models – the journey's phases, the messages, a participant's details – their converters, and the logic behind a screen, such as search |
| `tools/mock`             | [The mock back-end](./mock), route by route                                                                                                  |
| `scripts/release`        | Which artifacts a commit counts toward, and each one's next version                                                                          |

## The coverage ratchet

Every run measures coverage and fails below a floor. The floors are a ratchet rather than a target: each sits just under what the suite achieves, so a change that stops covering something fails, and a change that covers more is followed by raising the bar to just under the new figure.

The ratchet measures the logic everything else stands on – `libraries/host`, `libraries/utils`, the release scripts, and the mock. Components and screens stay outside it on purpose, because they are proved by Storybook and the walk-throughs rather than by a rendering test.

## The shells

Each shell's unit tests prove what the shell decides for itself: that its build settings deliver the web origin it loads, through the whole chain from build configuration to the code that reads it. The two suites mirror each other by name, because the shells do ([ADR 010](/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells)).

| Shell   | Command             | Runs                                                   |
| ------- | ------------------- | ------------------------------------------------------ |
| Apple   | `pnpm test:apple`   | Swift Testing on a Simulator, in the Local environment |
| Android | `pnpm test:android` | JUnit on the JVM, in the local flavor                  |

Both run the local environment only, because the other two differ from it only in the origin and have nothing of their own to prove. The Android tests also run on a pull request that touches the shell; the Apple tests run only on a developer's machine, because no macOS runner is spent on the shell ([Continuous integration](../development/continuous-integration)).

Both commands also compile the shell's [walk](./ui) without running it, so the walk keeps building between the times anybody runs it.
