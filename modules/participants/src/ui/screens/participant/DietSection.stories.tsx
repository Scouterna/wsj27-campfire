import type { Meta, StoryObj } from "@storybook/react-vite"

import type { HealthProfile } from "../../../model/HealthProfile"
import { complete } from "../../storybook/people"
import { DietSection } from "./DietSection"

const vaccinations: HealthProfile["vaccinations"] = {
  childhoodProgram: true,
  diphtheria: { kind: "unanswered" },
  tetanus: { kind: "unanswered" },
}

const meta: Meta<typeof DietSection> = {
  title: "Modules/Participants/Components/DietSection",
  component: DietSection,
  args: { health: complete.health ?? { vaccinations } },
}

export default meta

type Story = StoryObj<typeof DietSection>

/**
 * A diet chip, the graded allergens, and the free texts.
 */
export const Declared: Story = {}

/**
 * Every question answered no: the all-clear chips.
 */
export const AllClear: Story = {
  args: {
    health: { deniesDiet: true, deniesFoodAllergy: true, deniesOtherAllergy: true, vaccinations },
  },
}

/**
 * A form that never reached these questions, which is not an all-clear.
 */
export const Unanswered: Story = {
  args: { health: { vaccinations } },
}

/**
 * A food allergy ticked only as Övriga, and a yes with nothing written under it, each still
 * reading as a yes.
 */
export const BlankAnswers: Story = {
  args: {
    health: {
      foodAllergy: { details: "Kiwi, svullnar i munnen.", hasOther: true, severities: [] },
      otherAllergy: {},
      vaccinations,
    },
  },
}

/**
 * A food allergy with a yes and nothing else.
 */
export const BlankAllergy: Story = {
  args: { health: { foodAllergy: { severities: [] }, vaccinations } },
}
