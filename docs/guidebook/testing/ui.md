# UI tests

A UI test drives the real thing through its own interface – the web application in a browser, each shell on a device. The walk-throughs are what prove a screen still works, because the screens have almost no unit tests on purpose. A screen is mostly composition – a role deciding which cards appear, a route resolving a title, a widget found by its id – and only a browser driving the real application catches a route that was never registered ([ADR 024](/decisions/024-walk-through-the-web-application-per-module-with-playwright)).

## The Playwright walk-throughs

A module owns its walk-throughs the same way it owns its screens ([ADR 016](/decisions/016-compose-the-web-application-from-feature-modules)). Each module is a Playwright project of its own, finding its specs in the module's `test-ui/` – the name both shells already use for the suites that drive a running application. Running one project is the whole of what that module claims to do.

A walk signs in as one of the [mock's](./mock) personas and checks what that person sees: a leader's own unit on the start screen and nobody else's, the management searching the whole contingent, health answers shown only to those allowed them, the session ending under a live page and returning to sign-in.

```bash
pnpm test:web:ui                            # every module
pnpm test:web:ui --project=participants     # one module
```

How the suite runs, and why:

- **Against the local environment**, on `http://localhost:8000`, so the mock answers the back-end paths and the whole sign-in round trip is walkable, persona picker included. Playwright starts the environment when nothing answers there, and reuses one a developer already has running.
- **Chromium alone**, because the question is whether the screens are composed right, not whether three engines agree, and a browser matrix would triple the minutes to say the same thing.
- **Every test in its own browser context**, so the specs share no state and the whole suite runs in parallel.
- **Stricter in continuous integration.** A stray `test.only` fails there rather than quietly narrowing the run, and a failed test is retried once. Locally it is not, because locally the flake is worth seeing.
- **A trace only for a failed test**, the run where the recording is worth the wait, kept under `.build/playwright`.

On a pull request each module runs as a job of its own, and only when the change could affect what it proves – that module, the web application, a library, or the tooling ([Continuous integration](../development/continuous-integration)). The filter is generous on purpose, so the failure is running a walk nobody needed rather than skipping one somebody did. The modules are listed both in the Playwright configuration and in the workflow's matrix, so a module added to one and not the other runs nowhere or fails.

## The shell walks

A shell walk launches the real shell on a device and checks that it comes up. Which screens exist and what they say is the web application's to prove, so a shell walk asserts nothing about the screens ([ADR 024](/decisions/024-walk-through-the-web-application-per-module-with-playwright)).

| Shell   | Command                | Runs                                                 |
| ------- | ---------------------- | ---------------------------------------------------- |
| Apple   | `pnpm test:apple:ui`   | XCUITest on a Simulator, in the Local environment    |
| Android | `pnpm test:android:ui` | An instrumented test on an emulator the script boots |

Neither runs in continuous integration – the Apple walk because no macOS runner is spent on the shell, the Android one because a hosted emulator is slow and flaky enough to cost more attention than it saves. Both are compiled on every [unit-test run](./unit), so they keep building between the times anybody runs them.

The interactive back swipe is the one thing no walk reaches. The edge gesture cannot be synthesized, so it is checked by hand on both shells.
