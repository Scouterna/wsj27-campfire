import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { management, SocialDecorator } from "../../storybook/SocialDecorator"
import { SocialScreen } from "./SocialScreen"

const meta: Meta<typeof SocialScreen> = {
  title: "Modules/Material/Screens/SocialScreen",
  component: SocialScreen,
  decorators: [ScreenDecorator, SocialDecorator],
  parameters: { layout: "fullscreen" },
}

export default meta

type Story = StoryObj<typeof SocialScreen>

/**
 * The screen as a leader opens it: an empty picture to choose a photo for, and the frames
 * once there is one. The color is their unit's and there is nothing to choose.
 */
export const Leader: Story = {}

/**
 * The same screen for the contingent management, which belongs to no unit and so says who
 * each image is for: the contingent itself, or any one of the units.
 */
export const Management: Story = {
  parameters: { roles: { roles: management } },
}
