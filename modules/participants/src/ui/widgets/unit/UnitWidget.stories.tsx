import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import { unitList } from "../../storybook/cast"
import { UnitWidget } from "./UnitWidget"

const meta: Meta<typeof UnitWidget> = {
  title: "Modules/Participants/Widgets/UnitWidget",
  component: UnitWidget,
  decorators: [ApiDecorator],
}

export default meta

type Story = StoryObj<typeof UnitWidget>

/**
 * A leader's unit as the home screen shows it: the unit's mark and number, then the
 * deltagare and the ledare as pills.
 */
export const OneUnit: Story = {
  parameters: {
    api: {
      list: unitList(1),
      viewer: { memberNo: "1100101", readsEveryone: false, readsHealth: true, unitNumber: 1 },
    },
  },
}

/**
 * Still on its way – the identity shows at once, the people follow.
 */
export const Pending: Story = {
  parameters: {
    api: {
      state: "pending",
      viewer: { memberNo: "1100101", readsEveryone: false, readsHealth: true, unitNumber: 1 },
    },
  },
}
