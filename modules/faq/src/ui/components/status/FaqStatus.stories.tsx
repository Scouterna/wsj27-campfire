import { Button } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { FaqStatus } from "./FaqStatus"

const meta: Meta<typeof FaqStatus> = {
  title: "Modules/FAQ/Components/FaqStatus",
  component: FaqStatus,
}

export default meta

type Story = StoryObj<typeof FaqStatus>

/**
 * The FAQ on its way, with nothing to do but wait.
 */
export const Waiting: Story = {
  args: { message: "Hämtar frågorna …", title: "Frågor och svar" },
}

/**
 * A read that failed, with the way to ask again.
 */
export const Failed: Story = {
  args: {
    action: (
      <Button
        label="Försök igen"
        onPress={() => {
          // Nothing to ask in the catalog.
        }}
      />
    ),
    message: "Frågorna kunde inte hämtas.",
    title: "Frågor och svar",
  },
}
