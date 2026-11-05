import type { Meta, StoryObj } from "@storybook/react-vite"

import { complete } from "../../storybook/people"
import { PersonCare } from "./PersonCare"

const meta: Meta<typeof PersonCare> = {
  title: "Modules/Participants/Components/PersonCare",
  component: PersonCare,
  args: { care: { isSerious: true, needs: ["allergy", "health"] }, person: complete },
}

export default meta

/**
 * The button and the sheet it opens, as a person's card on a case draws them. Press it.
 */
export const WithSheet: StoryObj<typeof PersonCare> = {}
