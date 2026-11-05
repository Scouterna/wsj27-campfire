import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { patrolSections } from "../../../model/Patrol"
import { ApiDecorator } from "../../storybook/ApiDecorator"
import { unitInPatrols, unitInPatrolsDetails } from "../../storybook/cast"
import { useCareSheets } from "../../use-care-sheets"
import { GroupedPatrols, type GroupedPatrolsProps } from "./GroupedPatrols"

const unit = unitInPatrols().people

/**
 * The sections as a screen places them, with the care the screen reads for them.
 * @param props The sections' props but their care.
 * @returns The sections, with the notice over them and the sheet beside them.
 */
function SectionsWithCare(props: Omit<GroupedPatrolsProps, "care">): ReactElement {
  const care = useCareSheets(unit)
  return (
    <div className="story-screen-content">
      {care.notice}
      <GroupedPatrols care={care} {...props} />
      {care.sheet}
    </div>
  )
}

const meta: Meta<typeof GroupedPatrols> = {
  title: "Modules/Participants/Components/GroupedPatrols",
  component: GroupedPatrols,
  args: {
    leaders: unit.filter((person) => person.role === "ledare"),
    sections: patrolSections(unit),
  },
  decorators: [ApiDecorator],
  render: (args): ReactElement => (
    <SectionsWithCare leaders={args.leaders} sections={args.sections} />
  ),
  parameters: { layout: "fullscreen" },
}

export default meta

type Story = StoryObj<typeof GroupedPatrols>

/**
 * A unit partly divided: a card per patrol, the scouts in none, and the leaders last.
 */
export const PartlyDivided: Story = {}

/**
 * The same unit read by one of its leaders, each scout who declared anything carrying
 * their care.
 */
export const WithCare: Story = {
  parameters: {
    api: {
      unitDetails: unitInPatrolsDetails(),
      viewer: { memberNo: "1", readsEveryone: false, readsHealth: false, unitNumber: 1 },
    },
  },
}
