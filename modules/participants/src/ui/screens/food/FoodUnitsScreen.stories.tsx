import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import { wholeList } from "../../storybook/cast"
import { FoodUnitsScreen } from "./FoodUnitsScreen"

const healthTeam = { memberNo: "1200001", readsEveryone: true, readsHealth: true } as const

const meta: Meta<typeof FoodUnitsScreen> = {
  title: "Modules/Participants/Screens/FoodUnitsScreen",
  component: FoodUnitsScreen,
  decorators: [ScreenDecorator, ApiDecorator],
  // The list is seeded per story rather than here, because a story's parameters merge
  // into these, and a seeded list would outlast a story asking for a pending or failed read.
  parameters: { api: { viewer: healthTeam }, layout: "fullscreen" },
}

export default meta

type Story = StoryObj<typeof FoodUnitsScreen>

/**
 * Every numbered unit, each a way into its diets and food allergies.
 */
export const Units: Story = {
  parameters: { api: { list: wholeList } },
}

/**
 * The units are still on their way.
 */
export const Pending: Story = {
  parameters: { api: { state: "pending" } },
}

/**
 * The units could not be read.
 */
export const Failed: Story = {
  parameters: { api: { state: "error" } },
}
