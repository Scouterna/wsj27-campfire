import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { HandbookDecorator } from "../../storybook/HandbookDecorator"
import { faqFolders, handbook } from "../../storybook/fixtures"
import { FaqFolderScreen } from "./FaqFolderScreen"

const meta: Meta<typeof FaqFolderScreen> = {
  title: "Modules/Handbook/Screens/FaqFolderScreen",
  component: FaqFolderScreen,
  decorators: [ScreenDecorator, HandbookDecorator],
  parameters: { handbook: { folders: faqFolders, pages: handbook }, layout: "fullscreen" },
}

export default meta

type Story = StoryObj<typeof FaqFolderScreen>

/**
 * A folder read as one document, a question to a card.
 */
export const Questions: Story = {
  args: { folderId: "1" },
}

/**
 * An answer with a table and a link in it.
 */
export const WithATable: Story = {
  args: { folderId: "2" },
}

/**
 * The address names a folder the help center no longer has.
 */
export const Gone: Story = {
  args: { folderId: "gone" },
}

/**
 * The FAQ is still on its way.
 */
export const Pending: Story = {
  args: { folderId: "1" },
  parameters: { handbook: { state: "pending" } },
}
