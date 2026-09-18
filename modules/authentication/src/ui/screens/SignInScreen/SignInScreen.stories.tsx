import type { Meta, StoryObj } from "@storybook/react-vite"

import { SignInScreen } from "./SignInScreen"

const meta = {
  title: "Modules/Authentication/Screens/SignInScreen",
  component: SignInScreen,
  parameters: {
    // The screen draws its own full-height surfaces, so the canvas gives it the whole
    // frame rather than the padded box a component gets.
    layout: "fullscreen",
  },
} satisfies Meta<typeof SignInScreen>

export default meta

type Story = StoryObj<typeof meta>

/**
 * How the screen opens for anyone who is not signed in.
 */
export const Default: Story = {}
