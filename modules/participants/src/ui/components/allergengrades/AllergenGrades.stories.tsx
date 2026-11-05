import type { Meta, StoryObj } from "@storybook/react-vite"

import { AllergenGrades } from "./AllergenGrades"

const severities = [
  { allergen: "nuts", severity: 5 },
  { allergen: "sesame", severity: 4 },
  { allergen: "lactose", severity: 2 },
] as const

const meta: Meta<typeof AllergenGrades> = {
  title: "Modules/Participants/Components/AllergenGrades",
  component: AllergenGrades,
  args: { allergy: { severities } },
}

export default meta

type Story = StoryObj<typeof AllergenGrades>

/**
 * Each tone of the scale, with its two ends keyed under the rows.
 */
export const Graded: Story = {}

/**
 * The participant form's Övriga, which has no grade.
 */
export const Other: Story = {
  args: { allergy: { details: "Kiwi", hasOther: true, severities: [] } },
}
