import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import { caseRows, peopleRows } from "../../storybook/fixtures"
import { CasesScreen } from "./CasesScreen"

const meta: Meta<typeof CasesScreen> = {
  title: "Modules/Cases/Screens/CasesScreen",
  component: CasesScreen,
  // The screen first, so the cache the decorator mounts is around it.
  decorators: [ScreenDecorator, ApiDecorator],
  parameters: { layout: "fullscreen" },
}

export default meta

type Story = StoryObj<typeof CasesScreen>

/**
 * The open cases, newest first, each naming who it is about. "Avslutade" narrows to the
 * closed one, and "Mina" to the ones the reader opened.
 */
export const Open: Story = {
  parameters: { api: { cases: caseRows, people: peopleRows } },
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
