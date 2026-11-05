import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { CareButton } from "./CareButton"

const meta: Meta<typeof CareButton> = {
  title: "Modules/Participants/Components/CareButton",
  component: CareButton,
  args: { care: { needs: ["diet"] }, name: "Ester Dahl", onPress: fn() },
}

export default meta

type Story = StoryObj<typeof CareButton>

/**
 * A special diet: the leaf.
 */
export const Diet: Story = {}

/**
 * A serious allergy wears the same leaf as a diet, and only the button's name says how
 * serious it is.
 */
export const Serious: Story = { args: { care: { isSerious: true, needs: ["allergy"] } } }

/**
 * Health alone: the heart.
 */
export const Health: Story = { args: { care: { needs: ["health"] } } }

/**
 * Both glyphs at once.
 */
export const Both: Story = {
  args: { care: { isSerious: true, needs: ["allergy", "health", "diet"] } },
}
