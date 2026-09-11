import type { Meta, StoryObj } from "@storybook/react-vite"

import { JourneyScreen } from "./JourneyScreen"

const meta: Meta<typeof JourneyScreen> = {
  title: "Modules/Journey/JourneyScreen",
  component: JourneyScreen,
}

export default meta

type Story = StoryObj<typeof JourneyScreen>

export const Default: Story = {}
