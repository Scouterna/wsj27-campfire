# UI tests

A UI test here means driving the real thing through its own interface: the web application in a browser, and each shell on a device. It is what proves a screen still works, which matters more than usual in a repository where the screens themselves have almost no unit tests on purpose.

## The Playwright walk-throughs

`pnpm test:web:ui` runs Playwright against the web application, configured in `config/playwright/playwright.config.ts`.

A module owns its walk-throughs the same way it owns its screens. Each module is a Playwright project of its own, finding its specs in the module's `test-ui/` directory – `test-ui` rather than `test`, because that is what the two shells already call the suites that drive a running application. So `pnpm test:web:ui --project=participants` is the whole of what the participants module claims to do.

```bash
pnpm test:web:ui                       # every module's walk
pnpm test:web:ui --project=journey     # one module's
```

How the suite runs, and why:

- **Chromium alone.** The point is proving that the screens work, not that they work in three engines, and a browser matrix would cost three times the minutes to say the same thing.
- **The dev server is started by Playwright**, on `http://127.0.0.1:3000`, by calling Vite directly rather than through `pnpm start:web`. That script wraps the server in a process group of its own, and Playwright's teardown would then stop the wrapper and leave Vite holding the port, so the run would never exit. A server already running is reused rather than fought over.
- **Every test gets its own browser context**, and the specs share no state, so the whole suite runs in parallel.
- **Continuous integration is stricter than a developer's machine.** `test.only` left in a spec is a failure there rather than a quietly narrowed run, and a failed test is retried once – locally it is not, because locally the flake is the thing worth seeing.
- **A trace is kept only for a test that failed**, which is the run where the recording is worth the wait. Traces land in `.build/playwright`, which `pnpm clean` already removes.

On a pull request, `test_web.yml` runs the same four projects as a matrix, one leg per module, and each leg first asks whether the pull request could possibly change what it proves ([Continuous integration](../development/continuous-integration)). The list of modules is written in two places – the `modules` array in the Playwright configuration and the `module` matrix in the workflow – and a module added to one and not the other either runs nowhere or fails with "no project named X".

## The Apple walk

`pnpm test:apple:ui` runs `CampfireUITests` – an XCUITest that launches the real shell on a Simulator, always the Local scheme, and waits for it to draw. It is deliberately incurious about what is on screen: which words a user reads belongs to the web application, and this suite only ever asks whether the shell drew what it was told ([ADR 010](/decisions/010-deliver-the-front-end-as-one-web-application-in-native-shells)).

The suite is compiled on every `pnpm test:apple` run, whether or not anybody runs it, which is what keeps it from rotting.

## The Android walk

`pnpm test:android:ui` boots an emulator through `scripts/android/emulator.sh` and runs `connectedLocalDebugAndroidTest` on it. The walk launches `MainActivity` and asserts that it reaches `RESUMED` – the same shape as the Apple one, on the platform's own tools.

It is kept compiling the same way: `pnpm test:android` assembles the instrumented APK on every run without executing it, and so does `check_android.yml` on a pull request. Emulators on hosted runners are slow enough and flaky enough to cost more attention than they save, so nothing runs them in continuous integration.

## What the walks cannot reach

The interactive back swipe is a manual check on both shells. The edge gesture cannot be synthesized, so no walk can drive it.
