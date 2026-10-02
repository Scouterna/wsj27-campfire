import { Card } from "@scouterna/wsj27-campfire-ui"
import type { Decorator, Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { materialTree } from "../../storybook/cast"
import { FolderRow } from "./FolderRow"

/**
 * Puts the row in a card, where a row always sits.
 * @param Story The story being rendered.
 * @returns The story, in a card.
 */
const inCard: Decorator = (Story): ReactElement => (
  <Card>
    <Story />
  </Card>
)

const meta: Meta<typeof FolderRow> = {
  title: "Modules/Material/Components/FolderRow",
  component: FolderRow,
  decorators: [inCard],
}

export default meta

type Story = StoryObj<typeof FolderRow>

const [symbols] = materialTree

/**
 * A folder that holds only folders, counting the files under all of them.
 */
export const Folder: Story = {
  args: symbols?.kind === "folder" ? { folder: symbols } : {},
}
