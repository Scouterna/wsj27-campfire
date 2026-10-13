import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn, userEvent, within } from "storybook/test"

import { toCases } from "../../../data/dto/CaseDto"
import { toPeople } from "../../../data/dto/PersonDto"
import { ApiDecorator } from "../../storybook/ApiDecorator"
import { caseRows, peopleRows } from "../../storybook/fixtures"
import { AccessCard } from "./AccessCard"

const cases = toCases(caseRows)
const people = toPeople(peopleRows)

// What a leader of unit 1 reads: the unit's own listing, without the contingent management.
const unitOne = toPeople(
  peopleRows.filter((row) => (row as { readonly troop?: unknown }).troop === "1"),
)

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

const meta: Meta<typeof AccessCard> = {
  title: "Modules/Cases/Components/AccessCard",
  component: AccessCard,
  decorators: [ApiDecorator],
  args: {
    canShare: true,
    isBusy: false,
    item: caseWith("3"),
    onShare: fn(),
    people,
    readerMemberNo: "1200001",
  },
  parameters: { api: { people: peopleRows } },
}

export default meta

type Story = StoryObj<typeof AccessCard>

/**
 * Presses the card's own way to share, as a reader would, so a story opens on the panel.
 * @param context The story's rendered canvas.
 * @param context.canvasElement The element the story is drawn in.
 */
async function openSharing(context: { readonly canvasElement: HTMLElement }): Promise<void> {
  await userEvent.click(await within(context.canvasElement).findByRole("button", { name: "Dela" }))
}

/**
 * Shared with the head of contingent, as its health team member sees it – with a way to
 * take it back from her and to share it with someone else.
 */
export const Shared: Story = {}

/**
 * The same case as the person it is shared with sees it: who else has it, and no way to
 * change that.
 */
export const SharedAsSomeoneItIsSharedWith: Story = {
  args: { canShare: false, readerMemberNo: "1200401" },
}

/**
 * Sharing a health case: the leaders and CMT who do not see it, listed, since the catalog's
 * contingent is small enough to read – a real one is searched instead.
 */
export const Adding: Story = {
  play: openSharing,
}

/**
 * Shared with nobody yet.
 */
export const NotShared: Story = {
  args: { item: caseWith("2") },
}

/**
 * A leader's private case for their unit: the unit's other leader does not see it, so she
 * is offered – in a list, since a leader has only a handful of people to share with.
 */
export const LeaderSharingAPrivateCase: Story = {
  play: openSharing,
  args: {
    item: {
      ...caseWith("3"),
      creatorMemberNo: "1100101",
      extraAccess: [],
      secrecyLevel: 5,
      troop: "1",
      type: "avdelning",
    },
    people: unitOne,
    readerMemberNo: "1100101",
  },
}

/**
 * A leader's ordinary case for their unit, which every leader of the unit sees already, so
 * there is nobody to share it with and nothing about sharing is said.
 */
export const LeaderUnitCase: Story = {
  args: {
    item: {
      ...caseWith("3"),
      creatorMemberNo: "1100101",
      extraAccess: [],
      troop: "1",
      type: "avdelning",
    },
    people: unitOne,
    readerMemberNo: "1100101",
  },
}

/**
 * A level 4 case, which can never be shared, says no more than who sees it.
 */
export const NeverShared: Story = {
  args: { canShare: false, item: caseWith("5") },
}

export const PrivateToTheReader: Story = {
  args: { item: caseWith("4") },
}
