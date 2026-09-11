import type { Meta, StoryObj } from "@storybook/react-vite"

import { SignInScreen } from "./SignInScreen"

const meta: Meta<typeof SignInScreen> = {
  title: "Modules/Authentication/SignInScreen",
  component: SignInScreen,
}

export default meta

type Story = StoryObj<typeof SignInScreen>

export const Default: Story = {}
