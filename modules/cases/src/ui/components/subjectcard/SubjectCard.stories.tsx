import type { Meta, StoryObj } from "@storybook/react-vite"

import { toPeople } from "../../../data/dto/PersonDto"
import { peopleRows } from "../../storybook/fixtures"
import { SubjectCard } from "./SubjectCard"

const people = toPeople(peopleRows)

const meta: Meta<typeof SubjectCard> = {
  title: "Modules/Cases/Components/SubjectCard",
  component: SubjectCard,
  args: { about: people.get("1300035"), name: "Ester Dahl" },
}

export default meta

type Story = StoryObj<typeof SubjectCard>

/**
 * A deltagare: their unit's badge, their name, and their role and unit under it.
 */
export const InAUnit: Story = {}

/**
 * Somebody outside the units says only their role.
 */
export const BeyondTheUnits: Story = {
  args: { about: people.get("1300098"), name: "Freja Sandberg" },
}

/**
 * Somebody the list of participants does not hold is named by member number, with
 * nothing under it.
 */
export const Unknown: Story = {
  args: { about: undefined, name: "Medlem 42" },
}
