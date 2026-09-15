import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { HomeScreen } from "./HomeScreen"

const meta = {
  title: "Modules/Home/HomeScreen",
  component: HomeScreen,
  args: { onSignOut: fn() },
} satisfies Meta<typeof HomeScreen>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { firstName: "Joakim" },
}
