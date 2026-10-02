import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { materialTree, symbolsFolder, whiteIconsFolder } from "../../storybook/cast"
import { MaterialDecorator } from "../../storybook/MaterialDecorator"
import { FolderScreen } from "./FolderScreen"

const meta: Meta<typeof FolderScreen> = {
  title: "Modules/Material/Screens/FolderScreen",
  component: FolderScreen,
  decorators: [ScreenDecorator, MaterialDecorator],
  parameters: { layout: "fullscreen", material: { tree: materialTree } },
}

export default meta

type Story = StoryObj<typeof FolderScreen>

/**
 * A folder of folders: the top of the symbols, where there is nothing to show but the
 * way further in.
 */
export const Folders: Story = {
  args: { folderId: symbolsFolder },
}

/**
 * A folder of white icons, on the dark backdrop the folders above it say they need.
 */
export const WhiteIcons: Story = {
  args: { folderId: whiteIconsFolder },
}

/**
 * An address naming a folder the tree does not hold, such as a link to a folder since
 * moved on Drive.
 */
export const NotFound: Story = {
  args: { folderId: "not-a-folder" },
}
