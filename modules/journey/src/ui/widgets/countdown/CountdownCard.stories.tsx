import type { Meta, StoryObj } from "@storybook/react-vite"

import { CountdownCard } from "./CountdownCard"

const meta: Meta<typeof CountdownCard> = {
  title: "Modules/Journey/Widgets/CountdownCard",
  component: CountdownCard,
}

export default meta

type Story = StoryObj<typeof CountdownCard>

/**
 * Months out on the rundresa: the count to the buses already runs to the minute, and the
 * bar is still dashed.
 */
export const Distant: Story = {
  args: {
    now: new Date(2026, 8, 20, 9, 0),
    travel: "rundresa",
  },
}

/**
 * The same count to the second – what the widget draws in the wide layout for everybody
 * who has not asked for reduced motion.
 */
export const DistantToTheSecond: Story = {
  args: {
    now: new Date(2026, 8, 20, 9, 0, 18),
    seconds: true,
    travel: "rundresa",
  },
}

/**
 * Weeks out: the same count, with the days running low.
 */
export const Approaching: Story = {
  args: {
    now: new Date(2027, 6, 1, 10, 30),
    travel: "rundresa",
  },
}

/**
 * On the road: the count turns to the journey's days, the travel days fill in, and
 * today stands taller.
 */
export const Traveling: Story = {
  args: {
    now: new Date(2027, 6, 24, 14, 0),
    travel: "rundresa",
  },
}

/**
 * At camp: the status counts the camp's days, and the legend says which one.
 */
export const Camping: Story = {
  args: {
    now: new Date(2027, 7, 4, 8, 0),
    travel: "rundresa",
  },
}

/**
 * The direktresa counts to its own departure for Olsztyn, and its road is three days
 * rather than eight.
 */
export const DistantDirektresa: Story = {
  args: {
    now: new Date(2026, 8, 20, 9, 0),
    travel: "direktresa",
  },
}

/**
 * The rundresa's road days are somebody else's: while its buses are in Latvia, the
 * direktresa is still counting down.
 */
export const ApproachingDirektresa: Story = {
  args: {
    now: new Date(2027, 6, 24, 14, 0),
    travel: "direktresa",
  },
}

/**
 * On the direktresa's own road, on the way to Olsztyn.
 */
export const TravelingDirektresa: Story = {
  args: {
    now: new Date(2027, 6, 27, 14, 0),
    travel: "direktresa",
  },
}

/**
 * At camp on the direktresa: the camp's days are everybody's, and the road to Olsztyn
 * is behind.
 */
export const CampingDirektresa: Story = {
  args: {
    now: new Date(2027, 7, 4, 8, 0),
    travel: "direktresa",
  },
}

/**
 * Somebody who travels on their own counts to the day the contingent reaches camp, and
 * the bar has no road on it.
 */
export const DistantOnTheirOwn: Story = {
  args: {
    now: new Date(2026, 8, 20, 9, 0),
    travel: "egenResa",
  },
}

/**
 * Weeks out on one's own: still counting to the camp, with no road on the bar.
 */
export const ApproachingOnTheirOwn: Story = {
  args: {
    now: new Date(2027, 6, 1, 10, 30),
    travel: "egenResa",
  },
}

/**
 * At camp for somebody who traveled on their own: the same camp, a shorter bar.
 */
export const CampingOnTheirOwn: Story = {
  args: {
    now: new Date(2027, 7, 4, 8, 0),
    travel: "egenResa",
  },
}

/**
 * Home again: the bar is done, the homecoming day is checked, and the caveat about the
 * dates is gone – they happened.
 */
export const Home: Story = {
  args: {
    now: new Date(2027, 7, 12, 12, 0),
    travel: "rundresa",
  },
}

/**
 * Home again on the direktresa: the same thank-you over the shorter bar.
 */
export const HomeDirektresa: Story = {
  args: {
    now: new Date(2027, 7, 12, 12, 0),
    travel: "direktresa",
  },
}

/**
 * Home again for somebody who traveled on their own: the thank-you over the shortest
 * bar.
 */
export const HomeOnTheirOwn: Story = {
  args: {
    now: new Date(2027, 7, 12, 12, 0),
    travel: "egenResa",
  },
}
