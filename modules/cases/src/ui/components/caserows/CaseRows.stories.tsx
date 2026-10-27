import { Card } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { toCases } from "../../../data/dto/CaseDto"
import { toPeople } from "../../../data/dto/PersonDto"
import { ApiDecorator } from "../../storybook/ApiDecorator"
import { caseRows, peopleRows } from "../../storybook/fixtures"
import { CaseRows } from "./CaseRows"

const cases = toCases(caseRows)
const people = toPeople(peopleRows)

const meta: Meta<typeof CaseRows> = {
  title: "Modules/Cases/Components/CaseRows",
  component: CaseRows,
  // Each row takes its case on through the cache, so the list needs one.
  decorators: [ApiDecorator],
  args: {
    cases: cases.filter((item) => !item.isClosed).slice(0, 3),
    label: "Väntar på någon",
    people,
  },
  parameters: { api: { memberNo: "1200001", people: peopleRows } },
  // The list sits in the card it is made for.
  render: (args): ReactElement => (
    <div className="story-column">
      <Card title="Väntar på någon">
        <CaseRows {...args} />
      </Card>
    </div>
  ),
}

export default meta

type Story = StoryObj<typeof CaseRows>

/**
 * A handful of open cases in a card, each naming who it is about.
 */
export const Default: Story = {}

/**
 * Before the names arrive, each row names its person by member number.
 */
export const NamesOnTheirWay: Story = {
  args: { people: undefined },
}
