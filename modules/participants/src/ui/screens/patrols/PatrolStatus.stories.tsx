import type { Meta, StoryObj } from "@storybook/react-vite"

import { fn } from "storybook/test"

import { PatrolStatus } from "./PatrolStatus"
import type { PatrolsEditor } from "./use-patrols"

import "./PatrolEditor.css"

const editor: PatrolsEditor = {
  draft: { names: ["Falkarna"], placements: new Map() },
  isSaving: false,
  lastSave: undefined,
  reset: fn(),
  save: fn(),
  say: fn(),
  spoken: { serial: 0, words: "" },
  update: fn(),
  writes: [],
}

const meta: Meta<typeof PatrolStatus> = {
  title: "Modules/Participants/Components/PatrolStatus",
  component: PatrolStatus,
  args: { editor },
  // Unclipped, so the story shows the words a screen reader hears, which the screen
  // itself never draws.
  render: (args) => (
    <div className="patrols-foot story-spoken">
      <PatrolStatus {...args} />
    </div>
  ),
}

export default meta

type Story = StoryObj<typeof PatrolStatus>

/**
 * A save on its way.
 */
export const Saving: Story = { args: { editor: { ...editor, isSaving: true } } }

/**
 * A save that landed for everybody.
 */
export const Saved: Story = {
  args: { editor: { ...editor, lastSave: { failed: [], saved: [] } } },
}

/**
 * A move.
 */
export const Moved: Story = {
  args: { editor: { ...editor, spoken: { serial: 1, words: "2 flyttade till Falkarna." } } },
}
