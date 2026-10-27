import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import { caseRows, peopleRows } from "../../storybook/fixtures"
import { pinClock } from "../../storybook/pin-clock"
import { WaitingCasesWidget } from "./WaitingCasesWidget"

const meta = {
  title: "Modules/Cases/Widgets/WaitingCasesWidget",
  component: WaitingCasesWidget,
  decorators: [ApiDecorator],
  // Which cases wait follows the clock, so the stories are told at a moment of their own.
  beforeEach: pinClock,
} satisfies Meta<typeof WaitingCasesWidget>

export default meta

type Story = StoryObj<typeof meta>

/**
 * A member of the health team, who sees the cases that wait for someone and can narrow
 * to health or CMT.
 */
export const Default: Story = {
  parameters: { api: { cases: caseRows, memberNo: "1200001", people: peopleRows } },
}

/**
 * Someone with one type, whose card has nothing to choose between.
 */
export const OneType: Story = {
  parameters: { api: { cases: caseRows, people: peopleRows, types: ["cmt"] } },
}

/**
 * Nothing waiting for anyone, which draws no card at all.
 */
export const Empty: Story = {
  parameters: { api: { cases: [], people: peopleRows } },
}

/**
 * The fixture's cases twice over, under ids of their own.
 */
const manyRows = [
  ...caseRows,
  ...caseRows.map((row, index) => ({
    ...row,
    id: 900 + index,
    title: `${String(row["title"])} igen`,
  })),
]

/**
 * More waiting than the card shows, so it ends with how many and the way to them all.
 */
export const More: Story = {
  parameters: { api: { cases: manyRows, memberNo: "1200001", people: peopleRows } },
}
