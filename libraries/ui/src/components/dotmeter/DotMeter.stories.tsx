import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { DotMeter } from "./DotMeter"

const meta: Meta<typeof DotMeter> = {
  title: "Components/DotMeter",
  component: DotMeter,
}

export default meta

type Story = StoryObj<typeof DotMeter>

/**
 * Every reading on a five-step scale.
 */
export const Levels: Story = {
  render: (): ReactElement => (
    <div className="story-stack">
      <DotMeter filled={1} total={5} tone="info" />
      <DotMeter filled={2} total={5} tone="info" />
      <DotMeter filled={3} total={5} tone="info" />
      <DotMeter filled={4} total={5} tone="caution" />
      <DotMeter filled={5} total={5} tone="danger" />
    </div>
  ),
}

/**
 * The three color families: danger for the top of a severity scale, caution just under
 * it, info for the mild end and for a plain reading.
 */
export const Tones: Story = {
  render: (): ReactElement => (
    <div className="story-stack">
      <DotMeter filled={5} total={5} tone="danger" />
      <DotMeter filled={4} total={5} tone="caution" />
      <DotMeter filled={2} total={5} tone="info" />
    </div>
  ),
}

/**
 * The small size, for the dots inside a pill – in the unit's own color rather than the
 * tones.
 */
export const Small: Story = {
  render: (): ReactElement => (
    <div className="story-stack">
      <DotMeter filled={4} size="small" total={5} tone="info" />
    </div>
  ),
}
