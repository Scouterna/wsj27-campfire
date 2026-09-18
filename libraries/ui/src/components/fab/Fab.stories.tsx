import type { Meta, StoryObj } from "@storybook/react-vite"

import { ParticipantsIcon } from "../../foundations/icons/set/ParticipantsIcon"
import { Fab } from "./Fab"

const meta: Meta<typeof Fab> = {
  title: "Components/Fab",
  component: Fab,
}

export default meta

type Story = StoryObj<typeof Fab>

/**
 * The page's primary action as the phone draws it.
 */
export const Default: Story = {
  args: {
    icon: <ParticipantsIcon size={24} strokeWidth={2.2} />,
    label: "Avdelningar",
    onPress: () => {
      // A story's press goes nowhere.
    },
  },
}
