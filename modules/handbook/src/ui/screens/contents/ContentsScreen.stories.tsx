import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { HandbookDecorator } from "../../storybook/HandbookDecorator"
import { handbook } from "../../storybook/fixtures"
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
 * Every chapter, numbered, with the one that changed lately marked.
 */
export const Contents: Story = {
  parameters: { handbook: { pages: handbook } },
}

/**
 * The contents as the contingent management reads them, with the way into the editor.
 */
export const ForAnEditor: Story = {
  parameters: { handbook: { pages: handbook, roles: [{ kind: "cmt" }] } },
}

/**
 * The handbook is still on its way.
 */
export const Pending: Story = {
  parameters: { handbook: { state: "pending" } },
}

/**
 * The CMS refused, so there is nothing to list and the control asks again.
 */
export const Failed: Story = {
  parameters: { handbook: { state: "error" } },
}

/**
 * The CMS answered with no pages yet.
 */
export const Empty: Story = {
  parameters: { handbook: { pages: [] } },
}
