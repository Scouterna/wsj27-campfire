import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { ProfilePill } from "./ProfilePill"

const meta = {
  title: "Components/ProfilePill",
  component: ProfilePill,
  args: { onPress: fn() },
} satisfies Meta<typeof ProfilePill>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The full form, at the side menu's foot: the initial, the name, and the role line.
 * The visible label is the person; the accessible name says what pressing does.
 */
export const Full: Story = {
  args: {
    name: "Anna Björk",
    detail: "Ledare · Avdelning 3",
    label: "Logga ut Anna Björk",
  },
}

/**
 * The compact form, at the navigation bar's trailing corner on a phone: the initial
 * alone, at the bar's 40-point size.
 */
export const Compact: Story = {
  args: {
    name: "Maria Kemeny",
    detail: "Kontingentledningen",
    label: "Logga ut Maria Kemeny",
    compact: true,
  },
}
