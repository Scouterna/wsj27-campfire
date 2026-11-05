import { Card } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { inReadingOrder } from "../../../model/Participant"
import { ApiDecorator } from "../../storybook/ApiDecorator"
import { cast, largePeopleList, unitInPatrols, unitInPatrolsDetails } from "../../storybook/cast"
import { useCareSheets } from "../../use-care-sheets"
import { PeopleList, type PeopleListProps } from "./PeopleList"

/**
 * The list as a screen places it, with the care the screen reads for it.
 * @param props The list's props but its care.
 * @returns The list in its card, with the notice over it and the sheet beside it.
 */
function ListWithCare(props: Omit<PeopleListProps, "care">): ReactElement {
  const care = useCareSheets(props.people)
  return (
    <div className="story-screen-content">
      {care.notice}
      <Card>
        <PeopleList care={care} {...props} />
      </Card>
      {care.sheet}
    </div>
  )
}

const meta: Meta<typeof PeopleList> = {
  title: "Modules/Participants/Components/PeopleList",
  component: PeopleList,
  args: { isUnitScoped: false, people: inReadingOrder(cast), resetKey: "" },
  decorators: [ApiDecorator],
  render: (args): ReactElement => (
    <ListWithCare isUnitScoped={args.isUnitScoped} people={args.people} resetKey={args.resetKey} />
  ),
  parameters: { layout: "fullscreen" },
}

export default meta

type Story = StoryObj<typeof PeopleList>

/**
 * The mock's contingent, in reading order: by name, however they are capitalized. Each
 * row places the person in the contingent, and from 768px says where they come from
 * after it – narrow the canvas and it goes.
 */
export const Rows: Story = {}

/**
 * One unit, as its leader lists it: the unit goes without saying, so where each person
 * comes from takes its place at every width, and a deltagare's age rides at the end.
 */
export const UnitScoped: Story = {
  args: {
    isUnitScoped: true,
    people: inReadingOrder(cast.filter((person) => person.unit?.number === 1)),
  },
}

/**
 * A leader's own unit, each scout who declared anything carrying their care. Press a leaf
 * or a heart and the sheet opens over the list without leaving it, and stays open as the
 * rows behind it come and go.
 */
export const WithCare: Story = {
  args: { isUnitScoped: true, people: inReadingOrder(unitInPatrols().people) },
  parameters: {
    api: {
      unitDetails: unitInPatrolsDetails(),
      viewer: { memberNo: "1100101", readsEveryone: false, readsHealth: false, unitNumber: 1 },
    },
  },
}

/**
 * The care could not be read, so the list says so once rather than let rows without a
 * mark read as nobody needing anything.
 */
export const CareUnknown: Story = {
  args: { isUnitScoped: true, people: inReadingOrder(unitInPatrols().people) },
  parameters: {
    api: {
      state: "error",
      viewer: { memberNo: "1100101", readsEveryone: false, readsHealth: false, unitNumber: 1 },
    },
  },
}

/**
 * The contingent's real size. Only the rows near the viewport are in the document, while
 * the list is as tall as all of them – scroll it and the scrollbar agrees. Every row stays
 * one detail line tall, however long the kår and the town.
 */
export const AtScale: Story = {
  args: { people: inReadingOrder(largePeopleList().people) },
}

/**
 * One row, so the shape of a row is readable on its own.
 */
export const OneRow: Story = {
  args: { people: inReadingOrder(cast).slice(0, 1) },
}
