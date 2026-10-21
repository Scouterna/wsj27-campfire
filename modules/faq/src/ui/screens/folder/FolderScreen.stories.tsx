import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { FaqDecorator } from "../../storybook/FaqDecorator"
import { faqFolders } from "../../storybook/fixtures"
import { FolderScreen } from "./FolderScreen"

const meta: Meta<typeof FolderScreen> = {
  title: "Modules/FAQ/Screens/FolderScreen",
  component: FolderScreen,
  decorators: [ScreenDecorator, FaqDecorator],
  parameters: { faq: { folders: faqFolders }, layout: "fullscreen" },
}

export default meta

type Story = StoryObj<typeof FolderScreen>

export const Questions: Story = {
  args: { folderId: "1" },
}

export const WithATable: Story = {
  args: { folderId: "2" },
}

export const Gone: Story = {
  args: { folderId: "gone" },
}
