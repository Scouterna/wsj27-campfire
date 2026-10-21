import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import { caseRows, peopleRows } from "../../storybook/fixtures"
import { MyCasesWidget } from "./MyCasesWidget"

// Two of the fixture cases handed to the reader.
const assigned = caseRows.map((row) =>
  row["id"] === 3 || row["id"] === 5 ? { ...row, assigned_to_id: 1_200_001 } : row,
)

const meta = {
  title: "Modules/Cases/Widgets/MyCasesWidget",
  component: MyCasesWidget,
  decorators: [ApiDecorator],
} satisfies Meta<typeof MyCasesWidget>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The cases the reader follows up, the one where something last happened first.
 */
export const Default: Story = {
  parameters: { api: { cases: assigned, memberNo: "1200001", people: peopleRows } },
}

/**
 * Nothing handed to the reader, said in a line rather than left as an empty card.
 */
export const NoneAssigned: Story = {
  parameters: { api: { cases: caseRows, memberNo: "1200001", people: peopleRows } },
}

/**
 * The cases on their way.
 */
export const Pending: Story = {
  parameters: { api: { memberNo: "1200001", state: "pending" } },
}
