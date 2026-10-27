import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { Initials } from "./Initials"

const meta: Meta<typeof Initials> = {
  title: "Components/Initials",
  component: Initials,
  args: { name: "Ester Dahl" },
}

export default meta

type Story = StoryObj<typeof Initials>

/**
 * A first and a last name.
 */
export const Default: Story = {}

/**
 * Middle names are skipped, and å, ä, and ö upper-case as Swedish upper-cases them.
 */
export const SwedishNames: Story = {
  render: (): ReactElement => (
    <div className="story-stack">
      <Initials name="åsa maria öberg" />
      <Initials name="Ängla Ström" />
    </div>
  ),
}

/**
 * One word gives one initial.
 */
export const OneWord: Story = {
  args: { name: "Pippi" },
}
