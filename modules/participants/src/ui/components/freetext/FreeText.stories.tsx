import type { Meta, StoryObj } from "@storybook/react-vite"

import { FreeText } from "./FreeText"

const meta: Meta<typeof FreeText> = {
  title: "Modules/Participants/Components/FreeText",
  component: FreeText,
  args: {
    label: "Beskriv din allergi(er)",
    text: "Nötter ger anafylaxi – bär alltid med sig adrenalinpenna.",
  },
}

export default meta

/**
 * The question in quiet type, and the answer in the person's own words.
 */
export const Answer: StoryObj<typeof FreeText> = {}
