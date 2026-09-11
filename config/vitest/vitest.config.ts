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
    ],

    coverage: {
      provider: "v8",
      reporter: ["text-summary"],
      // The logic the screens stand on. Components and screens are proved by Storybook
      // and the Playwright walk-through in each module's `test-ui`, so `libraries/ui`
      // and the modules' components stay outside the denominator on purpose.
      include: ["libraries/host/src/**", "libraries/utils/src/**", "tools/mock/src/**"],
      exclude: [
        // It starts a server and has no behavior of its own to assert.
        "tools/mock/src/main.ts",
        "**/*.test.ts",
      ],
      // A ratchet, not a target: each number sits just below what the suite achieves
      // today, so a change that stops covering something fails, and a change that covers
      // more is followed by raising the bar to just under the new figure.
      thresholds: {
        statements: 93,
        branches: 87,
        functions: 93,
        lines: 94,
      },
    },
  },
})
