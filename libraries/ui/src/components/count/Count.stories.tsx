import type { Meta, StoryObj } from "@storybook/react-vite"

import { Count } from "./Count"

const meta: Meta<typeof Count> = {
  title: "Components/Count",
  component: Count,
  args: { children: 3, said: "3 ärenden" },
}

export default meta

type Story = StoryObj<typeof Count>

export const Default: Story = {}

export const Small: Story = {
  args: { size: "small" },
}

/**
 * How many more a line leaves unnamed, read into the line as words.
 */
export const More: Story = {
  args: { children: "+4", said: " och 4 personer" },
}
