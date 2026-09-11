import { defineConfig, devices } from "@playwright/test"
import { fileURLToPath } from "node:url"

// Playwright's configuration, kept in config/ with every other tool's (ADR 006). The
// walk-throughs drive the real web application in a real browser, which is what makes
// them the proof that a screen still works – the screens themselves have almost no unit
// tests, on purpose.
//
// Paths are resolved from this file rather than from the working directory, because the
// suite is always run from the repository root.
const root = fileURLToPath(new URL("../..", import.meta.url))

/**
 * The feature modules, each its own Playwright project (ADR 024). A module owns its
 * walk-throughs the same way it owns its screens, so `pnpm test:web:ui
 * --project=participants` is the whole of what the participants module claims to do –
 * and continuous integration can skip a module the pull request never touched.
 *
 * The same four, in the same order, as the `module` matrix in
 * .github/workflows/test_web.yml. A module added to one and not the other either runs
 * nowhere or fails with "no project named X".
 */
const modules = ["authentication", "home", "journey", "participants"] as const

/**
 * Where the development server answers. `strictPort` in the Vite configuration means it
 * is this port or nothing, so the walk-throughs can name it rather than discover it.
 */
const origin = "http://127.0.0.1:3000"

export default defineConfig({
  // One project per module, each finding its specs beside the module they are about.
  // `test-ui` rather than `test`, because that is what the two shells already call the
  // suites that drive a running application.
  projects: modules.map((name) => ({
    name,
    testDir: `${root}modules/${name}/test-ui`,
    use: { ...devices["Desktop Chrome"] },
  })),

  // Chromium alone. The point is that the screens work, not that they work in three
  // engines, and a browser matrix would cost three times the minutes to say the same
  // thing.
  use: {
    baseURL: origin,
    // Kept only for a test that failed, which is the run where the recording is worth
    // the wait.
    trace: "retain-on-failure",
  },

  // A module's specs share no state – each test gets its own browser context, and the
  // application's session lives in memory in the page – so they can all run at once.
  fullyParallel: true,

  // `test.only` left in a spec passes locally and would quietly narrow the run in
  // continuous integration, so there it is a failure instead.
  forbidOnly: Boolean(process.env["CI"]),

  // One retry in continuous integration, none locally: a retry hides a flake on a
  // developer's machine, where the flake is the thing worth seeing.
  retries: process.env["CI"] ? 1 : 0,

  reporter: process.env["CI"] ? [["github"], ["list"]] : [["list"]],

  // Traces and screenshots land in the repository's own build directory, which `pnpm
  // clean` already removes and git already ignores.
  outputDir: `${root}.build/playwright`,

  webServer: {
    // The same Vite server `pnpm start:web` runs, called directly rather than through
    // `pnpm start:web`: that script wraps the server in scripts/start/server.sh, which
    // puts it in a process group of its own, and Playwright's teardown then stops the
    // wrapper and leaves Vite holding the port – so the run never exits.
    command: "pnpm --filter @scouterna/wsj27-campfire-web start",
    cwd: root,
    url: origin,
    // A server already running is reused rather than fought over: `strictPort` would
    // make a second one fail outright, and a developer who has the app up is exactly
    // who runs these.
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
