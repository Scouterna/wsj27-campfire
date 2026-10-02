import { Button } from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { MaterialStatus } from "./MaterialStatus"

const meta: Meta<typeof MaterialStatus> = {
  title: "Modules/Material/Components/MaterialStatus",
  component: MaterialStatus,
}

export default meta

type Story = StoryObj<typeof MaterialStatus>

/**
 * The material on its way, with nothing to do but wait.
 */
export const Waiting: Story = {
  args: { message: "Hämtar materialet …", title: "Material" },
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
    message: "Materialet kunde inte hämtas.",
    title: "Material",
  },
}
