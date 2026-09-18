import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { HomeScreen } from "./HomeScreen"

const meta = {
  title: "Modules/Home/Screens/HomeScreen",
  component: HomeScreen,
  decorators: [ScreenDecorator],
  parameters: {
    // A screen fills the frame, as sign-in's does – the decorator draws the page
    // surface, so the canvas adds no padded box around it.
    layout: "fullscreen",
  },
} satisfies Meta<typeof HomeScreen>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
