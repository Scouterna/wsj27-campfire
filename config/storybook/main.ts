import path from "node:path"

import type { StorybookConfig } from "@storybook/react-vite"

// Storybook's Vite root is this directory, not the repository's. The docgen plugin
// resolves both its tsconfig and its file globs against that root, so left alone it
// finds no tsconfig beside itself, concludes no component belongs to the TypeScript
// project, and silently skips every file – which is why the paths below are absolute.
const repository = path.resolve(import.meta.dirname, "../..")

// Storybook's configuration, kept in config/ with every other tool's (ADR 006). One
// instance for the whole monorepo: it indexes the ui library's components and every
// module's widgets and screens, so the whole visual vocabulary is browsable in one place.
const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: [
    "../../libraries/ui/src/**/*.stories.tsx",
    "../../libraries/ui/src/**/*.mdx",
    "../../modules/*/src/**/*.stories.tsx",
  ],
  addons: ["@storybook/addon-docs"],
  // The guidebook's icon set, served to the manager so the sidebar can carry the same
  // app icon the guidebook's nav bar does (see manager.ts) without a second copy of it.
  staticDirs: [{ from: "../vitepress/assets", to: "/brand" }],
  core: {
    // Storybook phones home with usage data by default. Nothing in this repository
    // reports anywhere it was not asked to.
    disableTelemetry: true,
  },
  typescript: {
    // The TypeScript docgen, so the Docs pages show each component's props – the
    // default react-docgen cannot read props typed inline on the function signature.
    reactDocgen: "react-docgen-typescript",
    reactDocgenTypescriptOptions: {
      tsconfigPath: path.join(repository, "tsconfig.json"),
      // The components themselves. A story documents a component rather than being one,
      // so the stories are the one thing left out.
      include: [
        path.join(repository, "libraries/*/src/**/*.tsx"),
        path.join(repository, "modules/*/src/**/*.tsx"),
      ],
      exclude: [
        path.join(repository, "**/*.stories.tsx"),
        path.join(repository, "**/node_modules/**"),
      ],
    },
  },
}

export default config
