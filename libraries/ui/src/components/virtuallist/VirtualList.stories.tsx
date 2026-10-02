import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { Card } from "../card/Card"
import { Row } from "../row/Row"
import { VirtualList } from "./VirtualList"

interface Item {
  readonly id: string
  readonly name: string
}

const items: readonly Item[] = Array.from({ length: 2600 }, (_, index) => ({
  id: String(index),
  name: `Person ${String(index + 1)}`,
}))

const meta = {
  title: "Components/VirtualList",
  component: VirtualList<Item>,
  args: {
    estimatedRowHeight: 72,
    items,
    keyOf: (item) => item.id,
    label: "Personer",
    renderRow: (item): ReactElement => (
      <Row leading={<span className="story-tile">{item.name.slice(-2)}</span>}>
        <strong>{item.name}</strong>
        <small>Rad {item.id}</small>
      </Row>
    ),
  },
  render: (args): ReactElement => (
    <div className="story-screen-content">
      <Card>
        <VirtualList {...args} />
      </Card>
    </div>
  ),
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof VirtualList<Item>>

export default meta

type Story = StoryObj<typeof meta>

export const AtScale: Story = {}

export const Short: Story = {
  args: { items: items.slice(0, 3) },
}
