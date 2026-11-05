import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { SelectionBar } from "./SelectionBar"

const meta: Meta<typeof SelectionBar> = {
  title: "Modules/Participants/Components/SelectionBar",
  component: SelectionBar,
  args: {
    canMove: () => true,
    count: 3,
    isBesideSave: false,
    onClear: fn(),
    onMove: fn(),
    patrols: ["Falkarna", "Uttrarna", "Patrull 3", "Patrull 4"],
  },
}

export default meta

type Story = StoryObj<typeof SelectionBar>

/**
 * Several picked, with a button for every patrol.
 */
export const Several: Story = {}

/**
 * One picked.
 */
export const One: Story = { args: { count: 1 } }

/**
 * Everybody picked in no patrol, so there is no patrol to take them out of.
 */
export const InNoPatrol: Story = { args: { canMove: (index) => index !== undefined } }

/**
 * Leaving room for the phone's floating save button.
 */
export const BesideSave: Story = { args: { isBesideSave: true } }
