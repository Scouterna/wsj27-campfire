import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { FaqDecorator } from "../../storybook/FaqDecorator"
import { faqFolders } from "../../storybook/fixtures"
import { FaqScreen } from "./FaqScreen"

const meta: Meta<typeof FaqScreen> = {
  title: "Modules/FAQ/Screens/FaqScreen",
  component: FaqScreen,
  decorators: [ScreenDecorator, FaqDecorator],
  parameters: { layout: "fullscreen" },
}

export default meta

type Story = StoryObj<typeof FaqScreen>

export const Folders: Story = {
  parameters: { faq: { folders: faqFolders } },
}

export const Pending: Story = {
  parameters: { faq: { state: "pending" } },
}

export const Failed: Story = {
  parameters: { faq: { state: "error" } },
}
