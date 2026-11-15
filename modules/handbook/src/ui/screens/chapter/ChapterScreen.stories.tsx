import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { HandbookDecorator } from "../../storybook/HandbookDecorator"
import { handbook } from "../../storybook/fixtures"
import { ChapterScreen } from "./ChapterScreen"

const meta: Meta<typeof ChapterScreen> = {
  title: "Modules/Handbook/Screens/ChapterScreen",
  component: ChapterScreen,
  decorators: [ScreenDecorator, HandbookDecorator],
  parameters: { layout: "fullscreen" },
}

export default meta

type Story = StoryObj<typeof ChapterScreen>

/**
 * A chapter with every kind of block, what changed in it, and the chapter before it.
 */
export const Chapter: Story = {
  args: { slug: "resa" },
  parameters: { handbook: { pages: handbook } },
}

/**
 * The first chapter, with only a chapter after it.
 */
export const FirstChapter: Story = {
  args: { slug: "valkommen" },
  parameters: { handbook: { pages: handbook } },
}

/**
 * An address no chapter or page holds.
 */
export const Missing: Story = {
  args: { slug: "saknas" },
  parameters: { handbook: { pages: handbook } },
}

/**
 * The handbook is still on its way.
 */
export const Pending: Story = {
  args: { slug: "resa" },
  parameters: { handbook: { state: "pending" } },
}
