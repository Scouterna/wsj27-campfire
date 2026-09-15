import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { ColumnDecorator } from "../../storybook/ColumnDecorator"
import { Button } from "./Button"

const meta = {
  title: "Components/Button",
  component: Button,
  args: { onPress: fn() },
  decorators: [ColumnDecorator],
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The action, available.
 */
export const Default: Story = {
  args: { label: "Sign in" },
}

/**
 * The action while it is unavailable – a navigation already under way.
 */
export const Disabled: Story = {
  args: { disabled: true, label: "Signing in…" },
}
