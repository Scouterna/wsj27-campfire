import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import { caseRows, peopleRows } from "../../storybook/fixtures"
import { OpenCasesWidget } from "./OpenCasesWidget"

const meta = {
  title: "Modules/Cases/Widgets/OpenCasesWidget",
  component: OpenCasesWidget,
  decorators: [ApiDecorator],
} satisfies Meta<typeof OpenCasesWidget>

export default meta

type Story = StoryObj<typeof meta>

/**
 * A member of the health team, who sees all their open cases and can narrow to health or CMT.
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
 * No open case of the type shown.
 */
export const Empty: Story = {
  parameters: { api: { cases: [], people: peopleRows } },
}
