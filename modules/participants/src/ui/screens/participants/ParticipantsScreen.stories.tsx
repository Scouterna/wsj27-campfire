import { ScreenDecorator } from "@scouterna/wsj27-campfire-ui"
import { RolesProvider } from "@scouterna/wsj27-campfire-utils"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useNavigate } from "@tanstack/react-router"
import { useEffect, type ReactElement } from "react"

import type { Viewer } from "../../../data/viewer"
import { ApiDecorator } from "../../storybook/ApiDecorator"
import { largePeopleList, nobodyList, unitList, wholeList } from "../../storybook/cast"
import { ParticipantsScreen } from "./ParticipantsScreen"

/**
 * A leader of unit 1 – the one viewer in this file that is not the widest, because the
 * unit-scoped list is what their grants give them.
 */
const leaderViewer: Viewer = {
  memberNo: "1100101",
  readsEveryone: false,
  readsHealth: false,
  unitNumber: 1,
}

const meta: Meta<typeof ParticipantsScreen> = {
  title: "Modules/Participants/Screens/ParticipantsScreen",
  component: ParticipantsScreen,
  // The screen first, so the cache and the viewer the decorator mounts are around it.
  decorators: [ScreenDecorator, ApiDecorator],
  parameters: {
    // A screen fills the frame – the decorator draws the page surface, so the canvas adds
    // no padded box around it.
    layout: "fullscreen",
  },
}

export default meta

type Story = StoryObj<typeof ParticipantsScreen>

/**
 * The whole contingent, as the management reads it: the search, the roles as chips, and
 * everyone they leave.
 */
export const WholeContingent: Story = {
  parameters: { api: { list: wholeList } },
}

/**
 * The list at the contingent's real size. What narrowing costs is only visible here,
 * because the cast the other stories read is a small fraction of the real list.
 */
export const WholeContingentAtScale: Story = {
  parameters: { api: { list: largePeopleList() } },
}

/**
 * A leader's own unit: searched and filtered like the contingent's list, in the unit's
 * smaller vocabulary, but with no way into a browser of the one unit they have.
 */
export const OneUnit: Story = {
  parameters: { api: { list: unitList(1), viewer: leaderViewer } },
  render: (): ReactElement => (
    <RolesProvider roles={[{ kind: "leader", unitNumber: 1 }]}>
      <ParticipantsScreen />
    </RolesProvider>
  ),
}

/**
 * The list is still on its way. The title stays, and the line says so rather than showing
 * an empty list as though it were the answer.
 */
export const Pending: Story = {
  parameters: { api: { state: "pending" } },
}

/**
 * The participants service refused. The line says so, and the control asks again.
 */
export const Failed: Story = {
  parameters: { api: { state: "error" } },
}

/**
 * A search nobody answers. The search and the chips stay usable, which is the whole point
 * of saying it in the line rather than emptying the screen.
 */
export const NothingMatched: Story = {
  parameters: { api: { list: wholeList } },
  render: (): ReactElement => <Narrowed />,
}

/**
 * A viewer whose grants list nobody. An answer, not a failure – so it reads as one.
 */
export const Empty: Story = {
  parameters: { api: { list: nobodyList } },
}

function Narrowed(): ReactElement {
  const navigate = useNavigate()

  useEffect(() => {
    void navigate({ replace: true, search: { q: "Zäta" }, to: "/participants" })
  }, [navigate])

  return <ParticipantsScreen />
}
