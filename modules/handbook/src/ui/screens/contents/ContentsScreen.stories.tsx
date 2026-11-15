import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { HandbookDecorator } from "../../storybook/HandbookDecorator"
import { faqFolders, handbook } from "../../storybook/fixtures"
import { ContentsScreen } from "./ContentsScreen"

const meta: Meta<typeof ContentsScreen> = {
  title: "Modules/Handbook/Screens/ContentsScreen",
  component: ContentsScreen,
  decorators: [ScreenDecorator, HandbookDecorator],
  parameters: { layout: "fullscreen" },
}

export default meta

type Story = StoryObj<typeof ContentsScreen>

/**
 * Every chapter, numbered, with the one that changed lately marked, and the FAQ's
 * folders under them.
 */
export const Contents: Story = {
  parameters: { handbook: { folders: faqFolders, pages: handbook } },
}

/**
 * The contents as the contingent management reads them, with the way into the editor.
 */
export const ForAnEditor: Story = {
  parameters: { handbook: { folders: faqFolders, pages: handbook, roles: [{ kind: "cmt" }] } },
}

/**
 * The handbook with no FAQ to go with it yet.
 */
export const WithoutQuestions: Story = {
  parameters: { handbook: { pages: handbook } },
}

/**
 * The handbook is still on its way.
 */
export const Pending: Story = {
  parameters: { handbook: { state: "pending" } },
}

/**
 * The CMS and the help center both refused, so there is nothing to list and each
 * control asks again.
 */
export const Failed: Story = {
  parameters: { handbook: { state: "error" } },
}

/**
 * The CMS and the help center answered with nothing yet.
 */
export const Empty: Story = {
  parameters: { handbook: { pages: [] } },
}
