import type { Meta, StoryObj } from "@storybook/react-vite"

import { Countdown } from "./Countdown"

const meta: Meta<typeof Countdown> = {
  title: "Components/Countdown",
  component: Countdown,
}

export default meta

type Story = StoryObj<typeof Countdown>

/**
 * Two days and change to go, ticking live.
 */
export const Counting: Story = {
  args: {
    at: new Date(Date.now() + 2 * 86_400_000 + 7 * 3_600_000 + 14 * 60_000 + 30_000),
    hint: "Då öppnar appen.",
    label: "Nedräkning",
    overline: "Lördag 19 september 19.30",
  },
}

/**
 * The final minute.
 */
export const AlmostThere: Story = {
  args: {
    at: new Date(Date.now() + 59_000),
    label: "Nedräkning",
    overline: "Snart",
  },
}

/**
 * The clock alone – no words, only the moment.
 */
export const ClockAlone: Story = {
  args: {
    at: new Date(Date.now() + 3 * 3_600_000),
    label: "Nedräkning",
  },
}
