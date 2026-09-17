import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { JourneyScreen } from "./JourneyScreen"

const meta: Meta<typeof JourneyScreen> = {
  title: "Modules/Journey/JourneyScreen",
  component: JourneyScreen,
  decorators: [ScreenDecorator],
  parameters: {
    // A screen fills the frame, as sign-in's does – the decorator draws the page
    // surface, so the canvas adds no padded box around it.
    layout: "fullscreen",
  },
}

export default meta

type Story = StoryObj<typeof JourneyScreen>

export const Default: Story = {}
