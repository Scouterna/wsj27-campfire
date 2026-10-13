import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { toPeople } from "../../../data/dto/PersonDto"
import { peopleRows } from "../../storybook/fixtures"
import { PersonMark } from "./PersonMark"

const people = toPeople(peopleRows)

const meta: Meta<typeof PersonMark> = {
  title: "Modules/Cases/Components/PersonMark",
  component: PersonMark,
  args: { name: "Ester Dahl", person: people.get("1300035") },
}

export default meta

type Story = StoryObj<typeof PersonMark>

/**
 * A deltagare wears their unit's badge.
 */
export const InAUnit: Story = {}

/**
 * The IST's and the management's own marks, beyond the units.
 */
export const BeyondTheUnits: Story = {
  render: (): ReactElement => (
    <div className="story-stack">
      <PersonMark name="Freja Sandberg" person={people.get("1300098")} />
      <PersonMark name="Helena Hägg" person={people.get("1200001")} />
    </div>
  ),
}

/**
 * Somebody the list of participants does not hold, or whose names are still on their
 * way, wears their initials – or the one initial a member number gives.
 */
export const Unplaced: Story = {
  render: (): ReactElement => (
    <div className="story-stack">
      <PersonMark name="Otto Lind" person={undefined} />
      <PersonMark name="Medlem 1300049" person={undefined} />
    </div>
  ),
}
