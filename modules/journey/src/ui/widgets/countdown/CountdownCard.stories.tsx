import type { Meta, StoryObj } from "@storybook/react-vite"

import { CountdownCard } from "./CountdownCard"

const meta: Meta<typeof CountdownCard> = {
  title: "Modules/Journey/Widgets/CountdownCard",
  component: CountdownCard,
}

export default meta

type Story = StoryObj<typeof CountdownCard>

/**
 * Months out: the count to the buses already runs to the minute, and the bar is still
 * dashed.
 */
export const Distant: Story = {
  args: {
    now: new Date(2026, 8, 20, 9, 0),
    preTrip: true,
  },
}

/**
 * The same count to the second – what the widget draws in the wide layout for everybody
 * who has not asked for reduced motion.
 */
export const DistantToTheSecond: Story = {
  args: {
    now: new Date(2026, 8, 20, 9, 0, 18),
    preTrip: true,
    seconds: true,
  },
}

/**
 * Weeks out: the same count, with the days running low.
 */
export const Approaching: Story = {
  args: {
    now: new Date(2027, 6, 1, 10, 30),
    preTrip: true,
  },
}

/**
 * On the road: the count turns to the journey's days, the travel days fill in, and
 * today stands taller.
 */
export const Traveling: Story = {
  args: {
    now: new Date(2027, 6, 24, 14, 0),
    preTrip: true,
  },
}

/**
 * At camp: the status counts the camp's days, and the legend says which one.
 */
export const Camping: Story = {
  args: {
    now: new Date(2027, 7, 4, 8, 0),
    preTrip: true,
  },
}

/**
 * Somebody who is not on the pre-trip – direct travel, or their own way there – counts
 * to the day the contingent reaches camp, and the bar has no road on it.
 */
export const DistantWithoutPreTrip: Story = {
  args: {
    now: new Date(2026, 8, 20, 9, 0),
    preTrip: false,
  },
}

/**
 * The pre-trip's travel days are somebody else's: while the buses are in Latvia, this
 * card is still counting down.
 */
export const ApproachingWithoutPreTrip: Story = {
  args: {
    now: new Date(2027, 6, 24, 14, 0),
    preTrip: false,
  },
}

/**
 * At camp without the pre-trip: the same camp, a shorter bar.
 */
export const CampingWithoutPreTrip: Story = {
  args: {
    now: new Date(2027, 7, 4, 8, 0),
    preTrip: false,
  },
}

/**
 * Home again: the bar is done, the homecoming day is checked, and the caveat about the
 * dates is gone – they happened.
 */
export const Home: Story = {
  args: {
    now: new Date(2027, 7, 12, 12, 0),
    preTrip: true,
  },
}

/**
 * Home again without the pre-trip: the same thank-you over the shorter bar.
 */
export const HomeWithoutPreTrip: Story = {
  args: {
    now: new Date(2027, 7, 12, 12, 0),
    preTrip: false,
  },
}
