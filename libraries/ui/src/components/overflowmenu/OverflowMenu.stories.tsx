import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState, type ReactElement } from "react"

import { OverflowMenu } from "./OverflowMenu"

const meta: Meta<typeof OverflowMenu> = {
  title: "Components/OverflowMenu",
  component: OverflowMenu,
}

export default meta

type Story = StoryObj<typeof OverflowMenu>

/**
 * The page's extra actions behind the round glass trigger: press it to open, choose
 * or press outside to close. The story counts what was chosen.
 */
export const Default: Story = {
  render: function DefaultStory(): ReactElement {
    const [chosen, setChosen] = useState("ingenting")

    return (
      <div className="story-stack">
        <OverflowMenu
          items={[
            {
              label: "Visa i Deltagare",
              onSelect: () => {
                setChosen("Visa i Deltagare")
              },
            },
            "divider",
            {
              label: "Påminn om rapport",
              onSelect: () => {
                setChosen("Påminn om rapport")
              },
            },
          ]}
        />
        <span className="story-readout">Senast valt: {chosen}</span>
      </div>
    )
  },
}
