import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"
import { fn, userEvent, within } from "storybook/test"

import { unitNumberOf, type Person } from "../../../model/Person"
import { ApiDecorator } from "../../storybook/ApiDecorator"
import { peopleRows } from "../../storybook/fixtures"
import { PersonPicker } from "./PersonPicker"

/**
 * Types into the search as a reader would, so a story opens on what it finds.
 * @param text What to type.
 * @returns The story's play step.
 */
function typing(text: string): (context: { readonly canvasElement: HTMLElement }) => Promise<void> {
  return async (context) => {
    await userEvent.type(await within(context.canvasElement).findByRole("textbox"), text)
  }
}

/**
 * Whether a person is in unit 1, for a picker that keeps to it.
 * @param person The person.
 * @returns True for someone in unit 1.
 */
function isInUnitOne(person: Person): boolean {
  return unitNumberOf(person) === 1
}

const meta: Meta<typeof PersonPicker> = {
  title: "Modules/Cases/Components/PersonPicker",
  component: PersonPicker,
  decorators: [ApiDecorator],
  args: { labelId: "person-picker-story-label", onPick: fn() },
  parameters: { api: { people: peopleRows } },
  // The field is labeled by text outside the picker, which a screen supplies.
  render: (args): ReactElement => (
    <div className="story-column">
      <p id={args.labelId}>Vem gäller det?</p>
      <PersonPicker {...args} />
    </div>
  ),
}

export default meta

type Story = StoryObj<typeof PersonPicker>

/**
 * Nothing typed yet, so nothing is listed.
 */
export const Empty: Story = {}

/**
 * Typing part of a name lists everyone who has it, with how many in the corner.
 */
export const Matches: Story = {
  play: typing("Forsberg"),
}

/**
 * Nobody has the name typed.
 */
export const NoMatches: Story = {
  play: typing("Zlatan"),
}

/**
 * A picker that keeps to one unit, with what it says when nobody there has the name.
 */
export const NoMatchesInTheUnit: Story = {
  args: { isOffered: isInUnitOne, nobodyText: "Ingen i avdelningen heter så." },
  play: typing("Freja"),
}

/**
 * Units may be chosen as a whole, so a unit's number lists the unit ahead of its people.
 */
export const UnitsAheadOfPeople: Story = {
  args: { onPickUnit: fn(), units: [1] },
  play: typing("1"),
}

/**
 * The contingent is still on its way.
 */
export const Pending: Story = {
  parameters: { api: { state: "pending" } },
}

/**
 * The participants service refused, and the box offers to ask again.
 */
export const Failed: Story = {
  parameters: { api: { state: "error" } },
}
