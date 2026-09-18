import type { Meta, StoryObj } from "@storybook/react-vite"

import { ProfilePill } from "./ProfilePill"

const meta = {
  title: "Components/ProfilePill",
  component: ProfilePill,
  args: { link: { to: "/profile" } },
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
    label: "Profil för Anna Björk",
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
    label: "Profil för Maria Kemeny",
    compact: true,
  },
}

/**
 * On the person's own page: the control stays, says it is the page showing, and a
 * press does nothing.
 */
export const Current: Story = {
  args: {
    name: "Anna Björk",
    detail: "Ledare · Avdelning 3",
    label: "Profil för Anna Björk",
    isCurrent: true,
  },
}
