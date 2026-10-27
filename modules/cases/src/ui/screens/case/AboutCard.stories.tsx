import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { toCases } from "../../../data/dto/CaseDto"
import { toPeople } from "../../../data/dto/PersonDto"
import { ApiDecorator } from "../../storybook/ApiDecorator"
import { caseRows, peopleRows } from "../../storybook/fixtures"
import { AboutCard } from "./AboutCard"

const cases = toCases(caseRows)
const people = toPeople(peopleRows)

/**
 * The fixture case with this identifier.
 * @param id The case's identifier.
 * @returns The case.
 */
function caseWith(id: string): (typeof cases)[number] {
  const found = cases.find((item) => item.id === id)
  if (found === undefined) {
    throw new Error(`No fixture case ${id}`)
  }
  return found
}

const meta: Meta<typeof AboutCard> = {
  title: "Modules/Cases/Components/AboutCard",
  component: AboutCard,
  decorators: [ApiDecorator],
  args: {
    canChange: true,
    isAdding: false,
    isBusy: false,
    item: caseWith("3"),
    onChange: fn(),
    onDoneAdding: fn(),
    people,
  },
  parameters: { api: { people: peopleRows } },
}

export default meta

type Story = StoryObj<typeof AboutCard>

/**
 * A case about one person, who cannot be taken off it, since it would be about nobody.
 */
export const OnePerson: Story = {}

/**
 * A case about two people, a card each with the way to take them off it.
 */
export const SeveralPeople: Story = {
  args: { item: caseWith("6") },
}

/**
 * The card for adding someone, opened from the page's menu under the people the case is
 * about already.
 */
export const Adding: Story = {
  args: { isAdding: true, item: caseWith("6") },
}

/**
 * A case about a unit as a whole.
 */
export const WholeUnit: Story = {
  args: { item: caseWith("7") },
}
