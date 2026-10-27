import type { Meta, StoryObj } from "@storybook/react-vite"
import { userEvent, within } from "storybook/test"

import { toCases } from "../../../data/dto/CaseDto"
import { toPeople } from "../../../data/dto/PersonDto"
import type { Case } from "../../../model/Case"
import { ApiDecorator } from "../../storybook/ApiDecorator"
import { caseRows, peopleRows } from "../../storybook/fixtures"
import { CaseRow } from "./CaseRow"

const cases = toCases(caseRows)
const people = toPeople(peopleRows)

/**
 * The fixture case with this identifier.
 * @param id The case's identifier.
 * @returns The case.
 */
function caseWith(id: string): Case {
  const found = cases.find((item) => item.id === id)
  if (found === undefined) {
    throw new Error(`No fixture case ${id}`)
  }
  return found
}

const meta: Meta<typeof CaseRow> = {
  title: "Modules/Cases/Components/CaseRow",
  component: CaseRow,
  // The row takes a case on through the cache, so it needs one, and a reader to take it.
  decorators: [ApiDecorator],
  args: { isAboutShown: true, item: caseWith("3"), people },
  parameters: { api: { memberNo: "1200001", people: peopleRows } },
}

export default meta

type Story = StoryObj<typeof CaseRow>

/**
 * Nobody follows the case up, so it waits for someone and offers to be taken on.
 */
export const NobodyResponsible: Story = {}

/**
 * Someone else follows it up, named under the rest, and there is nothing to take on.
 */
export const SomeoneResponsible: Story = {
  args: { item: { ...caseWith("3"), assigneeMemberNo: "1200002" } },
}

/**
 * Followed up, but quiet for longer than the period allows, so it waits again.
 */
export const Late: Story = {
  args: {
    item: {
      ...caseWith("3"),
      assigneeMemberNo: "1200002",
      latestNoteAt: new Date("2026-06-01T10:00:00Z"),
    },
  },
}

/**
 * A private case, as its creator reads it.
 */
export const PrivateToTheReader: Story = {
  args: { item: caseWith("4") },
}

/**
 * The same private case, as someone it is shared with reads it.
 */
export const PrivateToSomeoneElse: Story = {
  parameters: { api: { memberNo: "1200401", people: peopleRows } },
  args: { item: caseWith("4") },
}

/**
 * A case about a unit as a whole wears the unit's badge.
 */
export const AboutAUnit: Story = {
  args: { item: caseWith("7") },
}

/**
 * On one person's page a case about several still names them all, so the others on it
 * are not hidden.
 */
export const AboutSeveral: Story = {
  args: { isAboutShown: false, item: caseWith("6") },
}

/**
 * A closed case neither waits nor offers to be taken on.
 */
export const Closed: Story = {
  args: { item: caseWith("1") },
}

/**
 * Taking the case on is refused, which the row says under the rest.
 */
export const TakingFails: Story = {
  parameters: { api: { memberNo: "1200001", people: peopleRows, state: "error" } },
  play: async (context) => {
    const button = await within(context.canvasElement).findByRole("button", {
      name: /^Jag tar det/u,
    })
    // A row ignores a press for a moment after it appears, and just after the page moves,
    // which a reader never notices and a play function would.
    await new Promise((resolve) => setTimeout(resolve, 600))
    await userEvent.click(button)
  },
}
