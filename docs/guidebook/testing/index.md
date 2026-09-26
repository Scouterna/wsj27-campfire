# Testing

Campfire is tested in two layers, each aimed at a different kind of failure. Unit tests prove the logic – the models, the converters that decode what the back-end sends, the session client, the role helpers – in all three languages. Walk-throughs prove the screens, by driving the real web application in a real browser and each shell on a device, because a screen is mostly composition and its failures only show when the whole thing runs ([ADR 024](/decisions/024-walk-through-the-web-application-per-module-with-playwright)).

Underneath both is the mock back-end, a stand-in for the real services that answers as they do. The walk-throughs sign in and read the list of participants through it, so no test reaches a network, needs credentials, or touches a real person's data ([ADR 021](/decisions/021-develop-against-a-mock-back-end)).

The chapter is in three parts:

| Part                        | What it covers                                                             |
| --------------------------- | -------------------------------------------------------------------------- |
| [The mock back-end](./mock) | The stand-in for the back-end that local work and the walk-throughs run on |
| [Unit tests](./unit)        | Vitest for the TypeScript, and each shell's own tools for its language     |
| [UI tests](./ui)            | A Playwright walk-through per module, and a launch walk through each shell |

Tests live beside the code they cover rather than in a parallel tree – `string.test.ts` next to `string.ts`, a module's walk-throughs in its own `test-ui/` – and they are written with that code, so a package lands with the tests that prove it. The formatters, linters, and type checks are not tests and are covered in [The checks](../development/checks). What runs on a pull request is in [Continuous integration](../development/continuous-integration).

## What runs what

| Command                | What it runs                                                                 |
| ---------------------- | ---------------------------------------------------------------------------- |
| `pnpm test`            | Every TypeScript unit test, through Vitest, with the coverage ratchet        |
| `pnpm test:web:ui`     | The Playwright walk-throughs, one project per module, against the local mock |
| `pnpm test:apple`      | The Apple unit tests on a Simulator, and a compile of the Apple walk         |
| `pnpm test:apple:ui`   | The Apple walk, driving the real shell on a Simulator                        |
| `pnpm test:android`    | The Android unit tests on the JVM, and a compile of the Android walk         |
| `pnpm test:android:ui` | The Android walk, on an emulator the script boots                            |

## The known gaps

- **Nothing renders React in a unit test.** Components are proved in [Storybook](../design/) and by the walk-throughs instead, because a render in a fake DOM skips the routing and registration where a screen's failures live ([ADR 024](/decisions/024-walk-through-the-web-application-per-module-with-playwright)).
- **The interactive back swipe is checked by hand** on both shells, because no walk can synthesize the edge gesture.
- **Nothing checks the bridge across languages.** Each side is written against the one contract in [ADR 018](/decisions/018-bridge-the-web-application-and-the-shells-with-versioned-messages) and tested on its own, and a decoder that agrees with the encoder beside it proves nothing about the other side.
- **Nothing checks the mock against the real services.** It copies them by hand, so a change in a service reaches the mock only when someone copies it ([ADR 021](/decisions/021-develop-against-a-mock-back-end)).
