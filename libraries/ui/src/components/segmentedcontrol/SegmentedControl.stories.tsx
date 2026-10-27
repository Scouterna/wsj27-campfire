import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState, type ReactElement } from "react"

import { SegmentedControl, type SegmentedControlSize } from "./SegmentedControl"

const meta: Meta<typeof SegmentedControl> = {
  title: "Components/SegmentedControl",
  component: SegmentedControl,
}

export default meta

type Story = StoryObj<typeof SegmentedControl>

function Interactive(props: {
  readonly counts?: readonly (number | undefined)[]
  readonly entries: readonly string[]
  readonly size?: SegmentedControlSize
}): ReactElement {
  const [current, setCurrent] = useState(0)
  return (
    <SegmentedControl
      countSaid={(count) => (count === 1 ? "1 ärende" : `${String(count)} ärenden`)}
      counts={props.counts}
      current={current}
      entries={props.entries}
      label="Filtrera efter roll"
      onPick={setCurrent}
      size={props.size}
    />
  )
}

/**
 * The list's role filter – pick a segment and the pill slides to it.
 */
export const Filter: Story = {
  render: () => <Interactive entries={["Alla", "Deltagare", "Ledare", "IST", "CMT"]} />,
}

/**
 * Two segments – the smallest control that still is one.
 */
export const TwoSegments: Story = {
  render: () => <Interactive entries={["Kommande", "Avslutade"]} />,
}

/**
 * Each segment with how many it holds, and none where it holds nothing.
 */
export const Counts: Story = {
  render: () => (
    <Interactive counts={[2, 5, 0, 14]} entries={["Mina", "Väntar", "Pågår", "Avslutade"]} />
  ),
}

/**
 * The small control, for beside a heading.
 */
export const Small: Story = {
  render: () => <Interactive entries={["Hälsa", "CMT"]} size="small" />,
}
