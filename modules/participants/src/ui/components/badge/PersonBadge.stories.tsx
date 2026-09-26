import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { PersonBadge } from "./PersonBadge"

const meta: Meta<typeof PersonBadge> = {
  title: "Modules/Participants/Components/PersonBadge",
  component: PersonBadge,
  args: { firstName: "Ester", lastName: "Dahl" },
}

export default meta

type Story = StoryObj<typeof PersonBadge>

/**
 * The list row's tile, at 44 points.
 */
export const Row: Story = {}

/**
 * The profile header's circle, at 64.
 */
export const Profile: Story = {
  args: { size: "profile" },
}

/**
 * Two given names keep only the first letter of the first one, and å, ä, and ö upper-case
 * as Swedish upper-cases them.
 */
export const SwedishNames: Story = {
  render: (): ReactElement => (
    <div className="story-stack">
      <PersonBadge firstName="Åsa Maria" lastName="Öberg" />
      <PersonBadge firstName="Ängla" lastName="Ström" />
      <PersonBadge firstName="Öve" lastName="Älvsjö" />
    </div>
  ),
}

/**
 * A person the participants service sent as one word has no family name, so the badge
 * carries the one initial it has.
 */
export const OneName: Story = {
  args: { firstName: "Madonna", lastName: "" },
}
