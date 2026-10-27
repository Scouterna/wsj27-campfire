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
 * An open case: who it is about, what kind of case it is and who sees it, the field for a
 * new note, the action that closes it, and its history newest first. "Byt rubrik" in the
 * menu opens the title for a new one, and "Lägg till person" a card for someone more.
 */
export const Open: Story = {
  parameters: seeded,
}

/**
 * A case about two people, a card each with the way to take them off it, and in its
 * history the moment the second was added. "Lägg till person" in the menu opens a card for
 * one more under them.
 */
export const SeveralPeople: Story = {
  args: { caseId: "6" },
  parameters: seeded,
}

/**
 * A case about a unit as a whole rather than anyone in it.
 */
export const WholeUnit: Story = {
  args: { caseId: "7" },
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
 * A management case only the management sees, which can never be shared.
 */
export const NeverShared: Story = {
  args: { caseId: "5" },
  parameters: seeded,
}

/**
 * A health case private to the member of the health team who opened it.
 */
export const Private: Story = {
  args: { caseId: "4" },
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
