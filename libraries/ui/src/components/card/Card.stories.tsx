import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { Card } from "./Card"

const meta: Meta<typeof Card> = {
  title: "Components/Card",
  component: Card,
}

export default meta

type Story = StoryObj<typeof Card>

/**
 * A block of content on its own sheet, raised off the page's paper.
 */
export const Default: Story = {
  render: (): ReactElement => (
    <Card>
      <p className="story-filler">Ett kort med innehåll, upphöjt från papperet.</p>
    </Card>
  ),
}

/**
 * The card's heading above the sheet – an `h2`, so the page outline lists the card as
 * a section.
 */
export const WithTitle: Story = {
  render: (): ReactElement => (
    <Card title="Dagens läge">
      <p className="story-filler">Ett kort med rubrik ovanför, och innehållet på arket.</p>
    </Card>
  ),
}
