import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import { caseRows, peopleRows } from "../../storybook/fixtures"
import { PersonCasesScreen } from "./PersonCasesScreen"

const meta: Meta<typeof PersonCasesScreen> = {
  title: "Modules/Cases/Screens/PersonCasesScreen",
  component: PersonCasesScreen,
  // The screen first, so the cache the decorator mounts is around it.
  decorators: [ScreenDecorator, ApiDecorator],
  parameters: { layout: "fullscreen" },
  args: { memberNo: "1300049" },
}

export default meta

type Story = StoryObj<typeof PersonCasesScreen>

/**
 * One person's cases under the card saying who they are – an open one here, and the
 * rows lead with the title since the card already says who.
 */
export const Open: Story = {
  parameters: { api: { cases: caseRows, people: peopleRows } },
}

/**
 * Somebody with a closed case and nothing open.
 */
export const Closed: Story = {
  args: { memberNo: "1300035" },
  parameters: { api: { cases: caseRows, people: peopleRows } },
}

/**
 * Somebody no case is about – the answer, not a failure, so it reads as one.
 */
export const None: Story = {
  args: { memberNo: "1300077" },
  parameters: { api: { cases: caseRows, people: peopleRows } },
}

/**
 * Somebody the list of participants does not hold, named by member number.
 */
export const Unknown: Story = {
  args: { memberNo: "42" },
  parameters: { api: { cases: caseRows, people: peopleRows } },
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
