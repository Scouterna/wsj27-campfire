import { SectionsProvider } from "@scouterna/wsj27-campfire-ui"
import type { Decorator, Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"
import { fn } from "storybook/test"

import type { HealthProfile } from "../../../model/HealthProfile"
import type { ParticipantDetail } from "../../../model/ParticipantDetail"
import { complete, withoutHealth } from "../../storybook/people"
import { CareSheet } from "./CareSheet"

const vaccinations: HealthProfile["vaccinations"] = {
  childhoodProgram: true,
  diphtheria: { kind: "notGiven" },
  tetanus: { kind: "notGiven" },
}

/**
 * A deltagare in a patrol, with exactly these answers.
 * @param health What they declared.
 * @param notes What they wrote in the catch-all questions.
 * @returns The record.
 */
function scoutWith(
  health: Omit<HealthProfile, "vaccinations"> | undefined,
  notes: ParticipantDetail["notes"] = [],
): ParticipantDetail {
  return {
    ...withoutHealth,
    birthDate: "2012-05-02",
    firstName: "Ester",
    lastName: "Dahl",
    notes,
    patrol: "Falkarna",
    role: "deltagare",
    ...(health !== undefined && { health: { ...health, vaccinations } }),
  }
}

/**
 * A reader whose menus lead to the person.
 * @param Story The story.
 * @returns The story, with the section granted.
 */
const granted: Decorator = (Story): ReactElement => (
  <SectionsProvider isGranted={() => true}>
    <Story />
  </SectionsProvider>
)

/**
 * A reader whose menus do not lead to the person.
 * @param Story The story.
 * @returns The story, with the section refused.
 */
const refused: Decorator = (Story): ReactElement => (
  <SectionsProvider isGranted={() => false}>
    <Story />
  </SectionsProvider>
)

const meta: Meta<typeof CareSheet> = {
  title: "Modules/Participants/Components/CareSheet",
  component: CareSheet,
  args: { onClose: fn(), person: complete },
  decorators: [granted],
}

export default meta

type Story = StoryObj<typeof CareSheet>

/**
 * Everything a person can have declared, in the order a leader reaches for it: food,
 * health, and what they wrote.
 */
export const Everything: Story = {}

/**
 * Graded allergies out of order on the form, read the worst first.
 */
export const SeriousAllergy: Story = {
  args: {
    person: scoutWith({
      foodAllergy: {
        details: "Jordnötter ger anafylaxi – bär EpiPen.",
        severities: [
          { allergen: "lactose", severity: 2 },
          { allergen: "nuts", severity: 5 },
          { allergen: "sesame", severity: 4 },
        ],
      },
    }),
  },
}

/**
 * An allergy that is no danger: no plate, only the grades.
 */
export const MildAllergy: Story = {
  args: {
    person: scoutWith({
      foodAllergy: { severities: [{ allergen: "lactose", severity: 2 }] },
    }),
  },
}

/**
 * The participant form's Övriga, ticked with no grade, and what they wrote.
 */
export const OnlyOvriga: Story = {
  args: {
    person: scoutWith({
      foodAllergy: {
        details: "Kiwi, svullnar i munnen. Bär antihistamin.",
        hasOther: true,
        severities: [],
      },
    }),
  },
}

/**
 * An allergy declared with nothing more to go on, which still has to read as one.
 */
export const BlankAllergy: Story = {
  args: { person: scoutWith({ foodAllergy: { severities: [] } }) },
}

/**
 * An allergy that is not to food, declared with nothing written.
 */
export const OtherAllergy: Story = {
  args: { person: scoutWith({ otherAllergy: {} }) },
}

/**
 * A diet alone, and nothing about it that could read as an all-clear on allergies.
 */
export const DietOnly: Story = {
  args: {
    person: scoutWith({ diet: { details: "Inget fläsk.", sort: "other" } }),
  },
}

/**
 * Medication alone.
 */
export const MedicationOnly: Story = {
  args: {
    person: scoutWith({
      medication: { details: "Astmamedicin vid behov.", managesOwn: true, storage: "Svalt." },
    }),
  },
}

/**
 * The mind and the support that goes with it.
 */
export const MentalHealth: Story = {
  args: {
    person: scoutWith({
      mind: {
        diagnoses: { details: "Behöver veta dagens program.", kinds: ["adhd", "autism"] },
        phobia: { details: "Spindlar" },
      },
      support: {
        personalAssistant: true,
        unpredictability: { details: "Blir orolig.", wantsSupport: true },
      },
    }),
  },
}

/**
 * Yeses with nothing written under them, each still a yes.
 */
export const BlankAnswers: Story = {
  args: {
    person: scoutWith({
      condition: {},
      equipment: { needs: [] },
      medication: {},
      mobility: { aids: [] },
    }),
  },
}

/**
 * A note alone, with the health answers not the viewer's to read.
 */
export const NoteOnly: Story = {
  args: {
    person: scoutWith(undefined, [{ audience: "avdelningsledaren", text: "Sover dåligt i tält." }]),
  },
}

/**
 * Nothing to show. The buttons never open this, because `careOf` raises a need on all
 * the sheet can say, and it claims nothing about the person if something else does.
 */
export const Nothing: Story = {
  args: { person: scoutWith(undefined) },
}

/**
 * For a reader whose menus do not lead to the person, the way onward stays away.
 */
export const WithoutTheWayOnward: Story = {
  decorators: [refused],
}
