import type { Meta, StoryObj } from "@storybook/react-vite"

import { CareUnknown } from "./CareUnknown"

const meta: Meta<typeof CareUnknown> = {
  title: "Modules/Participants/Components/CareUnknown",
  component: CareUnknown,
  args: { isShown: true },
}

export default meta

type Story = StoryObj<typeof CareUnknown>

/**
 * The care could not be read.
 */
export const Shown: Story = {}
