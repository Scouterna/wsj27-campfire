# Testing

Campfire is tested in layers, and the layers are not the same size. The static checks run on every change and are completely in place. Unit tests sit beside the code in all three languages. One Playwright walk-through per module drives the real web application in a real browser, and each shell has a walk of its own. Underneath all of it is the mock, which is why a test run never reaches a network.

The chapter is in three parts, each its own page:

| Part                        | What it covers                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| [The mock back-end](./mock) | The stand-in for both services that the application runs against, behind `pnpm start:local`     |
| [Unit tests](./unit)        | Vitest for the TypeScript, and each shell's own tools for the Swift and the Kotlin              |
| [UI tests](./ui)            | The Playwright walk-throughs through the web application, and each shell's walk through its own |

The formatters, linters, and type checks every change passes are not tests, and are covered as part of development in [The checks](../development/checks). What runs them on a pull request is on [Continuous integration](../development/continuous-integration).

Two habits hold across all of them. Tests live beside the code they cover rather than in a parallel tree – `string.test.ts` sits next to `string.ts`, and a module's walk-throughs sit in its own `test-ui/` – and they are written with that code rather than deferred to a phase that never comes.

## What runs what

| Command                | What it runs                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `pnpm test`            | Every TypeScript test, through Vitest, with the coverage ratchet                    |
| `pnpm test:web:ui`     | The Playwright walk-throughs, one project per module, against the local environment |
| `pnpm test:apple`      | The Apple unit tests on a Simulator, and a compile of the walk beside them          |
| `pnpm test:apple:ui`   | The Apple walk, driving the real shell on a Simulator                               |
| `pnpm test:android`    | The Android JVM unit tests, plus the instrumented compile                           |
| `pnpm test:android:ui` | The Android walk, on an emulator the script boots                                   |

## The known gaps

- **Nothing renders React in a test.** `libraries/ui` and the modules test in a Node environment, and their components are proved in [Storybook](../design/) and by the Playwright walk-throughs instead of by a rendering test.
- **The interactive back swipe is checked by hand.** The edge gesture cannot be synthesized, so neither shell walk can drive it.
- **The bridge is the one contract implemented in all three languages.** A decoder that agrees with the encoder beside it proves nothing about the wire ([ADR 018](/decisions/018-bridge-the-web-application-and-the-shells-with-versioned-messages)).
