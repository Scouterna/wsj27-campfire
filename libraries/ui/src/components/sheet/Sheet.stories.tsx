import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { Button } from "../button/Button"
import { Card } from "../card/Card"
import { UnitAvatar } from "../unitavatar/UnitAvatar"
import { Sheet } from "./Sheet"

const meta = {
  title: "Components/Sheet",
  component: Sheet,
  args: {
    children: <p>Samling vid flaggstången klockan åtta.</p>,
    isOpen: true,
    onClose: fn(),
    title: "Dagens program",
  },
} satisfies Meta<typeof Sheet>

export default meta

type Story = StoryObj<typeof meta>

/**
 * A title and a little to read. Narrow the canvas under 768px and it rises from the bottom
 * edge; wider, it is a centered panel.
 */
export const Short: Story = {}

/**
 * With a line under the title, a tile beside it, and a way onward under the content.
 */
export const Full: Story = {
  args: {
    description: "Avdelning 1 · Björnen",
    footer: <Button isOnward label="Visa hela programmet" onPress={fn()} />,
    leading: <UnitAvatar unitNumber={1} />,
  },
}

/**
 * More than fits: the heading and the footer stay put while the content scrolls, and the
 * page behind holds still.
 */
export const Long: Story = {
  args: {
    children: Array.from({ length: 12 }, (_, index) => (
      <Card key={index} title={`Dag ${String(index + 1)}`}>
        <p>Samling vid flaggstången klockan åtta, frukost, och sedan dagens aktivitet.</p>
      </Card>
    )),
    footer: <Button isOnward label="Visa hela programmet" onPress={fn()} />,
  },
}

/**
 * A title long enough to wrap, which the close button keeps its place beside.
 */
export const LongTitle: Story = {
  args: { title: "Anna Maria Charlotta Lindqvist-Björkman Sandberg af Ekenstam" },
}
