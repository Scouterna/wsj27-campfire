import type { Meta, StoryObj } from "@storybook/react-vite"

import { Logo } from "./Logo"

const meta: Meta<typeof Logo> = {
  title: "Components/Logo",
  component: Logo,
}

export default meta

type Story = StoryObj<typeof Logo>

/**
 * The size a page opens with.
 */
export const Full: Story = {
  args: { name: "Campfire" },
}

/**
 * The size a bar carries.
 */
export const Compact: Story = {
  args: { name: "Campfire", compact: true },
}
