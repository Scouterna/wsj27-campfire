import type { Meta, StoryObj } from "@storybook/react-vite"

import type { Viewer } from "../../../data/viewer"
import type { ParticipantDetail } from "../../../model/ParticipantDetail"
import { ApiDecorator } from "../../storybook/ApiDecorator"
import { complete, withoutHealth } from "../../storybook/people"
import { CareGlance } from "./CareGlance"

const healthViewer: Viewer = { memberNo: "1", readsEveryone: true, readsHealth: true }

const leaderViewer: Viewer = {
  memberNo: "1",
  readsEveryone: false,
  readsHealth: false,
  unitNumber: 3,
}

const declaredNothing: ParticipantDetail = {
  ...complete,
  health: {
    vaccinations: {
      childhoodProgram: true,
      diphtheria: { kind: "notGiven" },
      tetanus: { kind: "notGiven" },
    },
  },
  notes: [],
}

const meta: Meta<typeof CareGlance> = {
  title: "Modules/Participants/Components/CareGlance",
  component: CareGlance,
  args: { memberNo: complete.memberNo },
  decorators: [ApiDecorator],
}

export default meta

type Story = StoryObj<typeof CareGlance>

/**
 * A health reader, and somebody with needs.
 */
export const Needs: Story = {
  parameters: { api: { details: [complete], viewer: healthViewer } },
}

/**
 * One of the person's own unit's leaders, without a health grant: the care, with only the
 * notes addressed to the leader, as the leader's own lists show it.
 */
export const LeaderOfTheUnit: Story = {
  parameters: { api: { details: [complete], viewer: leaderViewer } },
}

/**
 * A reader without a health grant who leads no unit sees nothing, and asks for nothing.
 */
export const NotAHealthReader: Story = {
  parameters: {
    api: { details: [complete], viewer: { ...healthViewer, readsHealth: false } },
  },
}

/**
 * Somebody who declared nothing draws nothing, rather than an all-clear.
 */
export const NothingDeclared: Story = {
  parameters: { api: { details: [declaredNothing], viewer: healthViewer } },
}

/**
 * A record stepped down to the level without health draws nothing.
 */
export const SteppedDown: Story = {
  args: { memberNo: withoutHealth.memberNo },
  parameters: { api: { details: [withoutHealth], viewer: healthViewer } },
}

/**
 * Still on its way, and refused: nothing either way.
 */
export const Refused: Story = {
  parameters: { api: { state: "error", viewer: healthViewer } },
}
