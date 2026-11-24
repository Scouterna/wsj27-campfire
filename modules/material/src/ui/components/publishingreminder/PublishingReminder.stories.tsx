import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { twoSaidNo } from "../../storybook/withheld"
import { WithheldSlotProvider } from "../../withheld-slot"
import { PublishingReminder } from "./PublishingReminder"

const meta: Meta<typeof PublishingReminder> = {
  title: "Modules/Material/Components/PublishingReminder",
  component: PublishingReminder,
  args: { unitNumber: 1 },
}

export default meta

type Story = StoryObj<typeof PublishingReminder>

/**
 * A unit where somebody said no: their names over the line every image carries.
 */
export const SomebodySaidNo: Story = {
  render: (args): ReactElement => (
    <WithheldSlotProvider slot={twoSaidNo}>
      <PublishingReminder {...args} />
    </WithheldSlotProvider>
  ),
}

/**
 * A unit where nobody the reader can see said no: the line alone.
 */
export const TheLineAlone: Story = {}

/**
 * The management's empty picture, whose names sit beside the unit it picks instead.
 */
export const WithoutAUnit: Story = {
  render: (): ReactElement => (
    <WithheldSlotProvider slot={twoSaidNo}>
      <PublishingReminder />
    </WithheldSlotProvider>
  ),
}
