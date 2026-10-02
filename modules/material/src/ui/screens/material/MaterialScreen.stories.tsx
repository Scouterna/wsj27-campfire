import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { bearLeader, MaterialDecorator } from "../../storybook/MaterialDecorator"
import { materialTree } from "../../storybook/cast"
import { MaterialScreen } from "./MaterialScreen"

const meta: Meta<typeof MaterialScreen> = {
  title: "Modules/Material/Screens/MaterialScreen",
  component: MaterialScreen,
  decorators: [ScreenDecorator, MaterialDecorator],
  parameters: { layout: "fullscreen" },
}

export default meta

type Story = StoryObj<typeof MaterialScreen>

/**
 * The screen for someone with no unit: the search, the folders, and the files at the
 * top.
 */
export const Folders: Story = {
  parameters: { material: { tree: materialTree } },
}

/**
 * The same screen for a leader, with their own unit's symbols gathered from the folders
 * and offered first.
 */
export const OwnUnitsSymbols: Story = {
  parameters: { material: { tree: materialTree, user: bearLeader } },
}

/**
 * A material folder with nothing in it.
 */
export const Empty: Story = {
  parameters: { material: { tree: [] } },
}

/**
 * The tree is still on its way.
 */
export const Pending: Story = {
  parameters: { material: { state: "pending" } },
}

/**
 * A read that failed with nothing cached, so there is nothing to browse and the control
 * asks again.
 */
export const Failed: Story = {
  parameters: { material: { state: "error" } },
}
