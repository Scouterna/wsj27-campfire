import { ParticipantsIcon, SearchIcon } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { EmptyState } from "./EmptyState"

const meta: Meta<typeof EmptyState> = {
  title: "Modules/Participants/Components/EmptyState",
  component: EmptyState,
}

export default meta

type Story = StoryObj<typeof EmptyState>

/**
 * What a search that matches nobody shows, under the untouched search and chips.
 */
export const NothingMatched: Story = {
  args: {
    hint: "Prova ett annat namn, eller byt filter.",
    icon: <SearchIcon size={28} strokeWidth={1.8} />,
    title: "Inga träffar",
  },
}

/**
 * What an empty scope shows – nothing to narrow, so no hint about narrowing.
 */
export const NobodyToShow: Story = {
  args: {
    hint: "Listan med deltagare är tom just nu.",
    icon: <ParticipantsIcon size={28} strokeWidth={1.8} />,
    title: "Ingen att visa",
  },
}
