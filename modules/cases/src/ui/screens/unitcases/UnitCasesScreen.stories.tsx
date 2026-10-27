import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import { caseRows, peopleRows } from "../../storybook/fixtures"
import { UnitCasesScreen } from "./UnitCasesScreen"

const meta: Meta<typeof UnitCasesScreen> = {
  title: "Modules/Cases/Screens/UnitCasesScreen",
  component: UnitCasesScreen,
  // The screen first, so the cache the decorator mounts is around it.
  decorators: [ScreenDecorator, ApiDecorator],
  parameters: { layout: "fullscreen" },
  args: { unitNumber: 1 },
}

export default meta

type Story = StoryObj<typeof UnitCasesScreen>

/**
 * A unit's cases under the card saying which – those about it as a whole, those about
 * its people, and the closed ones.
 */
export const Open: Story = {
  parameters: { api: { cases: caseRows, memberNo: "1200001", people: peopleRows } },
}

/**
 * A unit nobody has opened a case about.
 */
export const Empty: Story = {
  args: { unitNumber: 9 },
  parameters: { api: { cases: caseRows, people: peopleRows } },
}
