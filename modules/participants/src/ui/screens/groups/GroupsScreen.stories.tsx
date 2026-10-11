import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import { largePeopleList, nobodyList, wholeList } from "../../storybook/cast"
import { GroupsScreen } from "./GroupsScreen"

const meta: Meta<typeof GroupsScreen> = {
  title: "Modules/Participants/Screens/GroupsScreen",
  component: GroupsScreen,
  decorators: [ScreenDecorator, ApiDecorator],
  parameters: { layout: "fullscreen" },
}

export default meta

type Story = StoryObj<typeof GroupsScreen>

/**
 * The groups view over the mock's contingent: its units, then the IST patrols, the IST outside
 * them, and the contingent management, each with how many people it holds.
 */
export const Entries: Story = {
  parameters: { api: { list: wholeList } },
}

/**
 * The groups view at the contingent's real size – every unit, then every IST patrol and
 * the management by funktion.
 */
export const EveryUnit: Story = {
  parameters: { api: { list: largePeopleList() } },
}

/**
 * The list the view is derived from is still on its way.
 */
export const Pending: Story = {
  parameters: { api: { state: "pending" } },
}

/**
 * The participants service refused, so there is nothing to browse and the control asks
 * again.
 */
export const Failed: Story = {
  parameters: { api: { state: "error" } },
}

/**
 * A viewer whose grants list nobody has no groups to browse either.
 */
export const Empty: Story = {
  parameters: { api: { list: nobodyList } },
}
