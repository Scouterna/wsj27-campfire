import { defineConfig, devices } from "@playwright/test"
import { fileURLToPath } from "node:url"

// Playwright's configuration, kept in config/ with every other tool's (ADR 006). The
// walk-throughs drive the real web application in a real browser, which is what makes
// them the proof that a screen still works – the screens themselves have almost no unit
// tests, on purpose.
//
// The repository root, resolved from this file's location so no path below depends on
// the working directory.
const root = fileURLToPath(new URL("../..", import.meta.url))

/**
 * The feature modules, each its own Playwright project (ADR 024). A module owns its
 * walk-throughs the same way it owns its screens, so `pnpm test:web:ui
 * --project=participants` is the whole of what the participants module claims to do –
 * and continuous integration can skip a module the pull request never touched.
 *
 * The same modules, in the same order, as the `module` matrix in
 * .github/workflows/test_web.yml. A module added to one and not the other either runs
 * nowhere or fails with "no project named X".
 */
const modules = ["authentication", "home", "journey", "participants"] as const

/**
 * Where the local environment answers: Caddy on the one origin, with the mock behind
 * `/api` and the Vite dev server behind everything else. The walks drive sign-in, and
 * sign-in needs a back-end, because bare Vite answers HTML on every `/api` path.
 */
const origin = "http://localhost:8000"

export default defineConfig({
  // One project per module, each finding its specs beside the module they are about.
  // `test-ui` rather than `test`, because that is what the shells call the suites that
  // drive a running application.
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

  // One retry in continuous integration and none locally, because a retry hides a flake
  // on a developer's machine, where the flake is the thing worth seeing.
  retries: process.env["CI"] ? 1 : 0,

  reporter: process.env["CI"] ? [["github"], ["list"]] : [["list"]],

  // Traces and screenshots land in the repository's own build directory, which `pnpm
  // clean` already removes and git already ignores.
  outputDir: `${root}.build/playwright`,

  // The processes `pnpm start:local` runs, started by Playwright one by one rather than
  // through that script, because the script puts each server in a process group of its
  // own, and Playwright's teardown would stop the wrapper and leave the servers holding
  // their ports, so the run never exits. Each entry is a direct command Playwright can
  // kill, reused when a developer already has the environment up.
  //
  // Playwright waits for each server's url before launching the next, so the mock and
  // Vite start first and Caddy last, because its readiness check runs through the proxy
  // and needs the mock already answering.
  webServer: [
    {
      command: "pnpm --filter @scouterna/wsj27-campfire-mock start",
      cwd: root,
      url: "http://localhost:8003/__mock__/state",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "pnpm --filter @scouterna/wsj27-campfire-web start",
      cwd: root,
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "caddy run --config config/environments/local/Caddyfile --adapter caddyfile",
      cwd: root,
      // Through the front door and past the proxy, so this answers 2xx only once Caddy
      // and the mock are both up, and a half-started environment never counts as ready.
      url: "http://localhost:8000/__mock__/state",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
})
