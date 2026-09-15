import type { Meta, StoryObj } from "@storybook/react-vite"

import { Logo } from "./Logo"

const meta = {
  title: "Components/Logo",
  component: Logo,
} satisfies Meta<typeof Logo>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The contingent's mark, in the theme the toolbar picked.
 */
export const Default: Story = {}

/**
 * The full alt text is the default; a surface that already says what the mark is
 * shortens it.
 */
export const ShortAlt: Story = {
  args: { alt: "WSJ27 – Swedish Contingent" },
}
