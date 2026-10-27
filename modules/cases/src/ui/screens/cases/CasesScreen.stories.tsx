import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import { caseRows, peopleRows } from "../../storybook/fixtures"
import { pinClock } from "../../storybook/pin-clock"
import { CasesScreen } from "./CasesScreen"

const meta: Meta<typeof CasesScreen> = {
  title: "Modules/Cases/Screens/CasesScreen",
  component: CasesScreen,
  // The screen first, so the cache the decorator mounts is around it.
  decorators: [ScreenDecorator, ApiDecorator],
  parameters: { layout: "fullscreen" },
  // Which cases wait follows the clock, so the stories are told at a moment of their own.
  beforeEach: pinClock,
}

export default meta

type Story = StoryObj<typeof CasesScreen>

/**
 * Two of the cases handed to someone else, so each list has something in it.
 */
const handedOut = caseRows.map((row) =>
  row["id"] === 3 || row["id"] === 5 ? { ...row, assigned_to_id: 1_200_002 } : row,
)

/**
 * A member of the health team on their own cases, those they opened. "Väntar" holds the
 * cases nobody follows up, "Pågår" the two someone else does, and "Avslutade" the closed
 * one.
 */
export const Open: Story = {
  parameters: { api: { cases: handedOut, memberNo: "1200001", people: peopleRows } },
}

/**
 * The cases have arrived but the contingent's names have not, so each row names its
 * person by member number until they do.
 */
export const NamesOnTheirWay: Story = {
  parameters: { api: { cases: caseRows, state: "pending" } },
}

/**
 * No cases at all – the answer, not a failure, so it reads as one.
 */
export const Empty: Story = {
  parameters: { api: { cases: [], people: peopleRows } },
}

/**
 * The cases are still on their way.
 */
export const Pending: Story = {
  parameters: { api: { state: "pending" } },
}

/**
 * The cases service refused, so the line says so and the control asks again.
 */
export const Failed: Story = {
  parameters: { api: { state: "error" } },
}
