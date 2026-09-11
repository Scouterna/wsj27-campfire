import { create } from "storybook/theming"

// The one theme both halves of Storybook read – the manager for its sidebar and
// toolbar (manager.ts), the preview for its Docs pages (preview.tsx) – so the two
// cannot drift. The values are the guidebook's: the contingent's official red where
// VitePress puts its brand color, VitePress's own grays for the surfaces and the text,
// its font stack, and the same app icon its nav bar carries, served from
// config/vitepress/assets through the static directory main.ts declares.

/**
 * Storybook's theme, the guidebook's look carried over to the catalog.
 */
export const theme = create({
  base: "light",

  brandTitle: "Campfire UI",
  brandImage: "./brand/icon.svg",
  brandTarget: "_self",

  colorPrimary: "#ce4a17",
  colorSecondary: "#ce4a17",

  appBg: "#f6f6f7",
  appContentBg: "#ffffff",
  // The guidebook's brand-soft – the official red at 14% – where Storybook's default
  // is a light blue that nothing else here uses.
  appHoverBg: "rgba(206, 74, 23, 0.14)",
  appPreviewBg: "#ffffff",
  appBorderColor: "#e2e2e3",
  appBorderRadius: 8,

  fontBase: "'Inter', ui-sans-serif, system-ui, sans-serif",
  fontCode: "ui-monospace, 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', monospace",

  textColor: "#3c3c43",
  textMutedColor: "#67676c",
  barTextColor: "#67676c",
  barSelectedColor: "#ce4a17",
  barHoverColor: "#9a3616",
  barBg: "#ffffff",

  inputBg: "#ffffff",
  inputBorder: "#e2e2e3",
  inputTextColor: "#3c3c43",
  inputBorderRadius: 8,
})
