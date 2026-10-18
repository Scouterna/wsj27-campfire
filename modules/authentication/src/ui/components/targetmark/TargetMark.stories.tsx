import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { toTargets } from "../../../data/dto/TargetDto"
import { targetRows } from "../../storybook/fixtures"
import { TargetMark } from "./TargetMark"

const targets = toTargets(targetRows)
const leader = targets.find((target) => target.memberNo === "1100101")
const manager = targets.find((target) => target.memberNo === "1200101")

const meta: Meta<typeof TargetMark> = {
  title: "Modules/Authentication/Components/TargetMark",
  component: TargetMark,
  args: { isUnitShown: true, ...(leader !== undefined && { target: leader }) },
}

export default meta

type Story = StoryObj<typeof TargetMark>

/**
 * A leader wears their unit's badge with the leader's star.
 */
export const Leader: Story = {}

/**
 * Before the units reveal a leader wears their initials, and the management its own
 * badge, which names no unit.
 */
export const BeforeTheReveal: Story = {
  render: (): ReactElement => (
    <div className="story-stack">
      {leader !== undefined && <TargetMark isUnitShown={false} target={leader} />}
      {manager !== undefined && <TargetMark isUnitShown={false} target={manager} />}
    </div>
  ),
}
