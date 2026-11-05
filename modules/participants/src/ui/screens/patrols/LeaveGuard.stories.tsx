import type { Meta, StoryObj } from "@storybook/react-vite"
import { Link } from "@tanstack/react-router"
import { userEvent, within } from "storybook/test"

import { LeaveGuard } from "./LeaveGuard"

const meta: Meta<typeof LeaveGuard> = {
  title: "Modules/Participants/Components/LeaveGuard",
  component: LeaveGuard,
  args: { isUnsaved: true },
  // A link away for the play function to follow, because the question shows only once a
  // navigation is stopped.
  render: (args) => (
    <>
      <Link to="/profile">Gå härifrån</Link>
      <LeaveGuard {...args} />
    </>
  ),
}

export default meta

/**
 * A navigation stopped while changes are still to save.
 */
export const Unsaved: StoryObj<typeof LeaveGuard> = {
  play: async (context) => {
    await userEvent.click(within(context.canvasElement).getByRole("link"))
  },
}
