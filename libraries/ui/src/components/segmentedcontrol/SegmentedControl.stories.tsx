import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState, type ReactElement } from "react"

import { SegmentedControl } from "./SegmentedControl"

const meta: Meta<typeof SegmentedControl> = {
  title: "Components/SegmentedControl",
  component: SegmentedControl,
}

export default meta

type Story = StoryObj<typeof SegmentedControl>

function Interactive(props: { readonly entries: readonly string[] }): ReactElement {
  const [current, setCurrent] = useState(0)
  return (
    <SegmentedControl
      current={current}
      entries={props.entries}
      label="Filtrera efter roll"
      onPick={setCurrent}
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
