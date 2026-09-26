import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import { largePeopleList, nobodyList, wholeList } from "../../storybook/cast"
import { UnitsScreen } from "./UnitsScreen"

const meta: Meta<typeof UnitsScreen> = {
  title: "Modules/Participants/Screens/UnitsScreen",
  component: UnitsScreen,
  decorators: [ScreenDecorator, ApiDecorator],
  parameters: { layout: "fullscreen" },
}

export default meta

type Story = StoryObj<typeof UnitsScreen>

/**
 * The browser over the mock's contingent: its units, then the IST and the contingent
 * management, each with how many people it holds.
 */
export const Entries: Story = {
  parameters: { api: { list: wholeList } },
}

/**
 * The browser at the contingent's real size – every unit, then the entries that are not
 * units.
 */
export const EveryUnit: Story = {
  parameters: { api: { list: largePeopleList() } },
}

/**
 * The list the browser is derived from is still on its way.
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
 * A viewer whose grants list nobody has no units to browse either.
 */
export const Empty: Story = {
  parameters: { api: { list: nobodyList } },
}
