import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { ApiDecorator } from "../../storybook/ApiDecorator"
import { unitInPatrols, unitInPatrolsDetails } from "../../storybook/cast"
import { PatrolsScreen } from "./PatrolsScreen"

const leaderOfUnit1 = {
  memberNo: "1600000",
  readsEveryone: false,
  readsHealth: true,
  unitNumber: 1,
} as const

const meta: Meta<typeof PatrolsScreen> = {
  title: "Modules/Participants/Screens/PatrolsScreen",
  component: PatrolsScreen,
  decorators: [ScreenDecorator, ApiDecorator],
  parameters: {
    api: { list: unitInPatrols(), unitDetails: unitInPatrolsDetails(), viewer: leaderOfUnit1 },
    layout: "fullscreen",
  },
}

export default meta

type Story = StoryObj<typeof PatrolsScreen>

/**
 * A unit three patrols in, with some scouts still in none – carry them onto a patrol, or
 * move them from their menu, and watch the patrol's figures follow. Press a chip to pick
 * it and move several at once, and press a leaf or a heart to read that scout's care.
 */
export const HalfDivided: Story = {}

/**
 * A unit nobody has divided: everybody waits in the tray over empty patrols.
 */
export const Undivided: Story = {
  parameters: { api: { list: unitInPatrols(0), unitDetails: [], viewer: leaderOfUnit1 } },
}

/**
 * Every scout placed, twelve to a patrol, so every patrol is past what it holds and each
 * meter says so.
 */
export const Overfull: Story = {
  parameters: { api: { list: unitInPatrols(36), unitDetails: [], viewer: leaderOfUnit1 } },
}

/**
 * A unit with no scouts yet, which has nothing to divide.
 */
export const NoScouts: Story = {
  parameters: {
    api: {
      list: { people: [], scope: { kind: "nobody" } },
      unitDetails: [],
      viewer: leaderOfUnit1,
    },
  },
}

/**
 * Somebody who leads no unit, who is told the patrols are the unit's own leaders' to set.
 */
export const NotALeader: Story = {
  parameters: {
    api: {
      list: unitInPatrols(),
      viewer: { memberNo: "1", readsEveryone: true, readsHealth: true },
    },
  },
}

/**
 * The unit is still on its way.
 */
export const Pending: Story = {
  parameters: { api: { state: "pending", viewer: leaderOfUnit1 } },
}
