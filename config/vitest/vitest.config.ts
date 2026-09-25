import { defineConfig } from "vitest/config"

// Vitest's configuration, kept in config/ with every other tool's (ADR 006). One
// hand-written project per package that has tests, so a package's tests run in the
// environment that package assumes – and a new package is a new entry here, on purpose,
// rather than a glob guessing.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "utils",
          root: "libraries/utils",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "ui",
          root: "libraries/ui",
          // node, not a DOM: the only tested logic here is pure, and the components are
          // verified in Storybook instead (ADR 023).
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "host",
          root: "libraries/host",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "authentication",
          root: "modules/authentication",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "home",
          root: "modules/home",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "journey",
          root: "modules/journey",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "participants",
          root: "modules/participants",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "mock",
          root: "tools/mock",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "release",
          root: "scripts/release",
          environment: "node",
          include: ["*.test.ts"],
        },
      },
    ],

    coverage: {
      provider: "v8",
      reporter: ["text-summary"],
      // Vitest writes its scratch here while it runs even though the only report is text,
      // so it goes where every other generated file goes: ignored, and cleared by
      // `pnpm clean`, rather than a `coverage/` at the root that git can pick up mid-run.
      reportsDirectory: ".build/coverage",
      // The logic the screens stand on. Components and screens are proved by Storybook
      // and the Playwright walk-through in each module's `test-ui`, so `libraries/ui`
      // and the modules' components stay outside the denominator on purpose.
      include: [
        "libraries/host/src/**",
        "libraries/utils/src/**",
        "scripts/release/**",
        "tools/mock/src/**",
      ],
      exclude: [
        // It starts a server and has no behavior of its own to assert.
        "tools/mock/src/main.ts",
        // Its test runs it as a subprocess inside a throwaway repository, where coverage
        // cannot see it; the rule it drives is covered directly.
        "scripts/release/next-version.ts",
        // A component, proved by the Playwright walks rather than a unit test – like
        // every component outside the denominator.
        "libraries/utils/src/roles/RolesProvider.tsx",
        "libraries/utils/src/user/UserProvider.tsx",
        "**/*.test.ts",
      ],
      // A ratchet, not a target: each number sits just below what the suite achieves
      // today, so a change that stops covering something fails, and a change that covers
      // more is followed by raising the bar to just under the new figure.
      thresholds: {
        statements: 97,
        branches: 91,
        functions: 99,
        lines: 97,
      },
    },
  },
})
