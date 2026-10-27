import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"
import { fn } from "storybook/test"

import { toPeople } from "../../../data/dto/PersonDto"
import { peopleRows } from "../../storybook/fixtures"
import { PersonRow } from "./PersonRow"

const people = toPeople(peopleRows)

const meta: Meta<typeof PersonRow> = {
  title: "Modules/Cases/Components/PersonRow",
  component: PersonRow,
  args: { action: undefined, isBusy: false, memberNo: "1300035", people },
  // A row is a list item, so it stands in the list a screen gives it.
  render: (args): ReactElement => (
    <div className="story-column">
      <ul className="case-person-rows">
        <PersonRow {...args} />
      </ul>
    </div>
  ),
}

export default meta

type Story = StoryObj<typeof PersonRow>

/**
 * A reader who may change nothing about them sees who they are and where they belong.
 */
export const ReadOnly: Story = {}

/**
 * Sharing the case with them, spoken with their name.
 */
export const Sharing: Story = {
  args: { action: { label: "Dela", onPress: fn(), spoken: "Dela med" }, memberNo: "1200401" },
}

/**
 * Taking the case back from them, in the danger ink.
 */
export const Taking: Story = {
  args: { action: { isTaking: true, label: "Ta bort", onPress: fn() } },
}

/**
 * A write is under way, which holds the button still.
 */
export const Busy: Story = {
  args: { action: { isTaking: true, label: "Ta bort", onPress: fn() }, isBusy: true },
}

/**
 * The reader's own row says it is theirs.
 */
export const TheReader: Story = {
  args: { memberNo: "1200001", readerMemberNo: "1200001" },
}

/**
 * Before the names arrive, the row names the person by member number.
 */
export const NamesOnTheirWay: Story = {
  args: { people: undefined },
}

/**
 * A unit a case is about as a whole wears the same shape, so it lines up with the people.
 */
export const Unit: Story = {
  args: { action: { isTaking: true, label: "Ta bort", onPress: fn() }, unitNumber: 1 },
}
