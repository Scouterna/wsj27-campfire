import type { Meta, StoryObj } from "@storybook/react-vite"

import type { HealthProfile } from "../../../model/HealthProfile"
import { complete } from "../../storybook/people"
import { HealthSection } from "./HealthSection"

const vaccinations: HealthProfile["vaccinations"] = {
  childhoodProgram: true,
  diphtheria: { kind: "unanswered" },
  tetanus: { kind: "unanswered" },
}

const meta: Meta<typeof HealthSection> = {
  title: "Modules/Participants/Components/HealthSection",
  component: HealthSection,
  args: { health: complete.health, notes: complete.notes },
}

export default meta

type Story = StoryObj<typeof HealthSection>

/**
 * The declared facts as rows and the catch-all notes as callouts.
 */
export const Declared: Story = {}

/**
 * Every question answered no: the all-clear chip on its own.
 */
export const AllClear: Story = {
  args: { health: { isHealthAnswered: true, vaccinations }, notes: [] },
}

/**
 * A form that never reached these questions, which is not an all-clear.
 */
export const Unanswered: Story = {
  args: { health: { vaccinations }, notes: [] },
}

/**
 * Yeses with nothing written under them, each still reading as a yes.
 */
export const BlankAnswers: Story = {
  args: {
    health: {
      condition: {},
      equipment: { needs: [] },
      medication: {},
      mind: { condition: {}, phobia: {} },
      mobility: { aids: [] },
      vaccinations,
    },
    notes: [],
  },
}
