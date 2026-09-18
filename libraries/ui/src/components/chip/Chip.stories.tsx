import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState, type ReactElement } from "react"

import { Chip } from "./Chip"

const meta: Meta<typeof Chip> = {
  title: "Components/Chip",
  component: Chip,
}

export default meta

type Story = StoryObj<typeof Chip>

/**
 * Without `onClick` a chip is a badge: a fact on a card, in its tone's tint.
 */
export const Badges: Story = {
  render: (): ReactElement => (
    <div className="chips">
      <Chip>Inga matallergier</Chip>
      <Chip tone="positive">Vegetarian</Chip>
      <Chip tone="warning">Simmar inte 200 m</Chip>
    </div>
  ),
}

/**
 * With `onClick` the chips are a filter row, and the one in force is lit – a toggle
 * that says whether it is pressed, not a place the reader is at.
 */
export const Filters: Story = {
  render: function FiltersStory(): ReactElement {
    const [selected, setSelected] = useState("Alla")

    return (
      <div className="chips">
        {["Alla", "Deltagare", "Ledare", "IST", "CMT"].map((name) => (
          <Chip
            key={name}
            onClick={() => {
              setSelected(name)
            }}
            selected={name === selected}
          >
            {name}
          </Chip>
        ))}
      </div>
    )
  },
}
