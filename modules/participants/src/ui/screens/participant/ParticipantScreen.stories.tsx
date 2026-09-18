import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import { complete, details, sparse, withoutHealth } from "./fixtures"
import { ParticipantScreen } from "./ParticipantScreen"

const meta: Meta<typeof ParticipantScreen> = {
  title: "Modules/Participants/Screens/ParticipantScreen",
  component: ParticipantScreen,
  decorators: [ScreenDecorator, ApiDecorator],
  parameters: {
    api: { details },
    // A screen fills the frame – the decorator draws the page surface, so the canvas
    // adds no padded box around it.
    layout: "fullscreen",
  },
}

export default meta

type Story = StoryObj<typeof ParticipantScreen>

/**
 * A leader who answered everything: every section has something to draw.
 */
export const Full: Story = {
  args: { memberNo: complete.memberNo },
}

/**
 * A record read without health access: the sections that have nothing to say are not
 * drawn, and nothing says why.
 */
export const Basic: Story = {
  args: { memberNo: withoutHealth.memberNo },
}

/**
 * A hole wherever the registration allowed one, so every absent state is visible at once.
 */
export const Minimal: Story = {
  args: { memberNo: sparse.memberNo },
}

/**
 * The record has not arrived.
 */
export const Pending: Story = {
  args: { memberNo: "0000" },
  parameters: { api: { state: "pending" } },
}

/**
 * A member number nobody holds, one outside the viewer's scope, or a payload that is not
 * a person – on purpose indistinguishable, and with nothing to retry.
 */
export const Failed: Story = {
  args: { memberNo: "0000" },
  parameters: { api: { state: "error" } },
}
