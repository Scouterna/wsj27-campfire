import type { Meta, StoryObj } from "@storybook/react-vite"

import { ParticipantsScreen } from "./ParticipantsScreen"

const meta: Meta<typeof ParticipantsScreen> = {
  title: "Modules/Participants/ParticipantsScreen",
  component: ParticipantsScreen,
}

export default meta

type Story = StoryObj<typeof ParticipantsScreen>

export const Default: Story = {}
