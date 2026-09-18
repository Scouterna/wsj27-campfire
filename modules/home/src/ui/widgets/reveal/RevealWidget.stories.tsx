import { RevealProvider, type Reveal } from "@scouterna/wsj27-campfire-ui"
import type { Decorator, Meta, StoryObj } from "@storybook/react-vite"

import { RevealWidget } from "./RevealWidget"

/**
 * The moment the story counts down to, written the way a reveal's overline writes
 * it – "Lördag 19 september 19.30" – so the words over the clock always match the
 * fabricated date under it.
 *
 * @param at The moment being counted down to.
 * @returns The moment in the overline's own words.
 */
function overlineFor(at: Date): string {
  const day = new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(at)
  const time = new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(at)
    .replace(":", ".")
  return `${day.charAt(0).toLocaleUpperCase("sv-SE")}${day.slice(1)} ${time}`
}

const at = new Date(Date.now() + 2 * 86_400_000 + 7 * 3_600_000 + 14 * 60_000 + 30_000)

/**
 * A reveal two days out – hung in a provider of its own, because outside one every
 * curtain reads as open and the widget would show nothing.
 */
const pending: Reveal = {
  at,
  hint: "Då öppnar appen – avdelningarna avslöjas och du får se din avdelning.",
  id: "story",
  overline: overlineFor(at),
}

const withCurtain: Decorator = (Story) => (
  <RevealProvider reveals={[pending]}>
    <Story />
  </RevealProvider>
)

const meta: Meta<typeof RevealWidget> = {
  title: "Modules/Home/Widgets/RevealWidget",
  component: RevealWidget,
  decorators: [withCurtain],
}

export default meta

type Story = StoryObj<typeof RevealWidget>

/**
 * The units reveal, counting down on the start screen.
 */
export const Pending: Story = {
  args: {
    reveal: pending,
  },
}
