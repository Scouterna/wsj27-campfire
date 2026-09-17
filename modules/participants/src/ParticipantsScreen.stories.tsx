import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import { RolesProvider } from "@scouterna/wsj27-campfire-utils"
import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { ParticipantsScreen } from "./ParticipantsScreen"

const meta: Meta<typeof ParticipantsScreen> = {
  title: "Modules/Participants/ParticipantsScreen",
  component: ParticipantsScreen,
  decorators: [ScreenDecorator],
  parameters: {
    // A screen fills the frame, as sign-in's does – the decorator draws the page
    // surface, so the canvas adds no padded box around it.
    layout: "fullscreen",
  },
}

export default meta

type Story = StoryObj<typeof ParticipantsScreen>

/**
 * Outside a leader's session the section is the whole list, so the bar reads Deltagare.
 */
export const Default: Story = {}

/**
 * A leader's section is their own unit, so the bar reads Min avdelning.
 */
export const ForALeader: Story = {
  render: (): ReactElement => (
    <RolesProvider roles={[{ kind: "leader", unitNumber: 3 }]}>
      <ParticipantsScreen />
    </RolesProvider>
  ),
}
