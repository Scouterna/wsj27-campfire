import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import { wholeList } from "../../storybook/cast"
import { UnitScreen } from "./UnitScreen"

const meta: Meta<typeof UnitScreen> = {
  title: "Modules/Participants/Screens/UnitScreen",
  component: UnitScreen,
  decorators: [ScreenDecorator, ApiDecorator],
  parameters: { api: { list: wholeList }, layout: "fullscreen" },
  args: { entryKey: "1" },
}

export default meta

type Story = StoryObj<typeof UnitScreen>

/**
 * One numbered unit: everyone in one name-sorted list, and a count that says where
 * they are.
 */
export const OneUnit: Story = {}

/**
 * The IST is not an avdelning, so the count says only how many they are.
 */
export const Ist: Story = {
  args: { entryKey: "ist" },
}

/**
 * The contingent management, the other entry that is not a unit.
 */
export const Cmt: Story = {
  args: { entryKey: "cmt" },
}

/**
 * A unit nobody in the viewer's scope is in, or one that does not exist – the same answer
 * either way, with the title kept so the screen still says where the reader is.
 */
export const UnknownUnit: Story = {
  args: { entryKey: "42" },
}

/**
 * The list this screen is read out of is still on its way.
 */
export const Pending: Story = {
  parameters: { api: { state: "pending" } },
}

/**
 * The participants service refused, so the control asks again.
 */
export const Failed: Story = {
  parameters: { api: { state: "error" } },
}
