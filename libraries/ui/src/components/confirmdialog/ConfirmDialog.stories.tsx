import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { ConfirmDialog } from "./ConfirmDialog"

const meta = {
  title: "Components/ConfirmDialog",
  component: ConfirmDialog,
  args: {
    confirmLabel: "Avsluta ärendet",
    description: "Ärendet flyttas till Avslutade. Du kan öppna det igen senare.",
    isOpen: true,
    onCancel: fn(),
    onConfirm: fn(),
    title: "Avsluta ärendet?",
  },
} satisfies Meta<typeof ConfirmDialog>

export default meta

type Story = StoryObj<typeof meta>

/**
 * Asking before a case is closed.
 */
export const Close: Story = {}
