import type { Meta, StoryObj } from "@storybook/react-vite"

import { NoteCallouts } from "./NoteCallouts"

const meta: Meta<typeof NoteCallouts> = {
  title: "Modules/Participants/Components/NoteCallouts",
  component: NoteCallouts,
  args: {
    notes: [
      { audience: "avdelningsledaren", text: "Vill gärna dela tält med någon från samma kår." },
      { audience: "kontingentledningen", text: "Hör av er om ni behöver veta mer." },
    ],
  },
}

export default meta

/**
 * Each note, titled by who the question named.
 */
export const BothAudiences: StoryObj<typeof NoteCallouts> = {}
