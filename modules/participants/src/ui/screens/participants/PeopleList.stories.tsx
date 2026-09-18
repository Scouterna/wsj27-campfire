import { Card } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { inReadingOrder } from "../../../model/Participant"
import { cast, largePeopleList } from "../../storybook/cast"
import { PeopleList } from "./PeopleList"

const meta: Meta<typeof PeopleList> = {
  title: "Modules/Participants/Components/PeopleList",
  component: PeopleList,
  args: { people: inReadingOrder(cast), resetKey: "" },
  render: (args): ReactElement => (
    <div className="story-screen-content">
      <Card>
        <PeopleList people={args.people} resetKey={args.resetKey} />
      </Card>
    </div>
  ),
  parameters: { layout: "fullscreen" },
}

export default meta

type Story = StoryObj<typeof PeopleList>

/**
 * The mock's contingent, in reading order: by name, however they are capitalized.
 */
export const Rows: Story = {}

/**
 * The contingent's real size. Only the rows near the viewport are in the document, while
 * the list is as tall as all of them – scroll it and the scrollbar agrees.
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
