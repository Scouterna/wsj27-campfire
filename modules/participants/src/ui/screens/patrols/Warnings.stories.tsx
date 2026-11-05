import type { Meta, StoryObj } from "@storybook/react-vite"

import { Warnings } from "./Warnings"

const meta: Meta<typeof Warnings> = {
  title: "Modules/Participants/Components/Warnings",
  component: Warnings,
  args: { failed: [], isPartial: false, shared: [] },
}

export default meta

type Story = StoryObj<typeof Warnings>

/**
 * Two patrols under one name.
 */
export const SharedName: Story = { args: { shared: ["Falkarna"] } }

/**
 * More than one name shared, each by patrols of its own.
 */
export const SharedNames: Story = { args: { shared: ["Falkarna", "Ugglorna"] } }

/**
 * A save that did not land for everybody.
 */
export const FailedSave: Story = {
  args: { failed: ["Cornelia Holm", "Elsa Norén"], isPartial: true },
}

/**
 * A save that landed for nobody.
 */
export const NothingSaved: Story = { args: { failed: ["Cornelia Holm", "Elsa Norén"] } }

/**
 * Both at once.
 */
export const Everything: Story = {
  args: { failed: ["Cornelia Holm"], isPartial: true, shared: ["Falkarna"] },
}
