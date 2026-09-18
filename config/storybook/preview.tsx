import type { Preview } from "@storybook/react-vite"

import { RouterDecorator } from "../../libraries/ui/src/storybook/RouterDecorator"
import { ThemeDecorator } from "../../libraries/ui/src/storybook/ThemeDecorator"
import { theme } from "./theme"

import "../../libraries/ui/assets/styles.css"
import "../../libraries/ui/src/storybook/stories.css"

const preview: Preview = {
  // Every component gets a generated Docs page from its stories and prop types, a
  // router so anything that links renders outside the application, and the unit theme
  // the toolbar picked.
  tags: ["autodocs"],
  decorators: [RouterDecorator, ThemeDecorator],
  // The five unit colors, switchable for every story from the toolbar – the whole
  // catalog must hold up in each of them.
  globalTypes: {
    theme: {
      description: "The unit color theme",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [
          { value: "blue", title: "Blue" },
          { value: "brown", title: "Brown" },
          { value: "green", title: "Green" },
          { value: "red", title: "Red" },
          { value: "yellow", title: "Yellow" },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    // The sidebar reads as the design system does – the introduction, the foundations
    // under it, then the components, and the modules that build on them last.
    // Alphabetical, which is the default, would open on Components and sort Foundations
    // after them.
    options: {
      storySort: {
        order: [
          "Introduction",
          "Foundations",
          "Components",
          "Modules",
          ["*", ["Components", "Widgets", "Screens"]],
        ],
      },
    },
    // The snippet is the JSX the story actually rendered. Left on "auto" a story with a
    // `render` function shows the story object itself – the `render:` key and all. The
    // Docs pages render in the preview, so the manager's theme reaches them only by
    // being handed over here.
    docs: { source: { type: "dynamic" }, theme },
  },
  initialGlobals: {
    theme: "blue",
  },
}

export default preview
