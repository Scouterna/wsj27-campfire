import { Card } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { inReadingOrder } from "../../../model/Participant"
import { cast, largePeopleList } from "../../storybook/cast"
import { PeopleList } from "./PeopleList"

const meta: Meta<typeof PeopleList> = {
  title: "Modules/Participants/Components/PeopleList",
  component: PeopleList,
  args: { isUnitScoped: false, people: inReadingOrder(cast), resetKey: "" },
  render: (args): ReactElement => (
    <div className="story-screen-content">
      <Card>
        <PeopleList
          isUnitScoped={args.isUnitScoped}
          people={args.people}
          resetKey={args.resetKey}
        />
      </Card>
    </div>
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
    people: inReadingOrder(cast.filter((person) => person.unitNumber === 1)),
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
