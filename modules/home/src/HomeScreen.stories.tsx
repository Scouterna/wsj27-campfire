import type { Meta, StoryObj } from "@storybook/react-vite"

import { HomeScreen } from "./HomeScreen"

const meta: Meta<typeof HomeScreen> = {
  title: "Modules/Home/HomeScreen",
  component: HomeScreen,
}

export default meta

type Story = StoryObj<typeof HomeScreen>

export const Default: Story = {}
