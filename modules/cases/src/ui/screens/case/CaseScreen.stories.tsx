import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import { caseRows, noteRows, peopleRows } from "../../storybook/fixtures"
import { CaseScreen } from "./CaseScreen"

const meta: Meta<typeof CaseScreen> = {
  title: "Modules/Cases/Screens/CaseScreen",
  component: CaseScreen,
  // The screen first, so the cache the decorator mounts is around it.
  decorators: [ScreenDecorator, ApiDecorator],
  parameters: { layout: "fullscreen" },
  args: { caseId: "3" },
}

export default meta

type Story = StoryObj<typeof CaseScreen>

// Said per story rather than on the meta, because Storybook merges a story's parameters
// into the meta's, and a seeded case would then answer the pending and failing stories.
const seeded = { api: { cases: caseRows, notes: noteRows, people: peopleRows } }

/**
 * An open case: who it is about, the field for a new note, the action that closes it,
 * and its history newest first.
 */
export const Open: Story = {
  parameters: seeded,
}

/**
 * A closed case takes no notes, and its action reopens it instead. Its history starts
 * with the closing.
 */
export const Closed: Story = {
  args: { caseId: "1" },
  parameters: seeded,
}

/**
 * An open case nobody has written on yet.
 */
export const NoNotes: Story = {
  args: { caseId: "2" },
  parameters: seeded,
}

/**
 * A case nobody the reader may see has – the same answer whether it does not exist or is
 * not theirs.
 */
export const Unknown: Story = {
  args: { caseId: "42" },
  parameters: seeded,
}

/**
 * The case is still on its way.
 */
export const Pending: Story = {
  parameters: { api: { state: "pending" } },
}

/**
 * The cases service refused.
 */
export const Failed: Story = {
  parameters: { api: { state: "error" } },
}
