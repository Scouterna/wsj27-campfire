import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"
import { fn } from "storybook/test"

import { patrolSize, patrolStats } from "../../../model/Patrol"
import { unitInPatrols } from "../../storybook/cast"
import { PatrolBoard } from "./PatrolBoard"
import { PatrolMember } from "./PatrolMember"

const scouts = unitInPatrols().people.filter((person) => person.role === "deltagare")

/**
 * The chips of the people on a board.
 * @param count How many.
 * @returns The chips.
 */
function chips(count: number): readonly ReactElement[] {
  return scouts
    .slice(0, count)
    .map((person) => (
      <PatrolMember
        isCarried={false}
        isLanded={false}
        isSelected={false}
        key={person.memberNo}
        moves={[]}
        onOpenCare={fn()}
        onPointerDown={fn()}
        onToggle={fn()}
        person={person}
      />
    ))
}

const meta: Meta<typeof PatrolBoard> = {
  title: "Modules/Participants/Components/PatrolBoard",
  component: PatrolBoard,
  args: {
    children: chips(4),
    index: 0,
    isOver: false,
    label: "Falkarna",
    name: "Falkarna",
    onRename: fn(),
    placeholder: "Patrull 1",
    stats: patrolStats(scouts.slice(0, 4)),
  },
}

export default meta

type Story = StoryObj<typeof PatrolBoard>

/**
 * A named patrol, with what it mixes.
 */
export const Named: Story = {}

/**
 * A name with nobody under it, which it says is not stored yet.
 */
export const NamedWithNobody: Story = {
  args: { children: [], stats: patrolStats([]) },
}

/**
 * Nobody in it and no name yet, so it goes by its place and says it can be dropped on.
 */
export const Empty: Story = {
  args: { children: [], label: "Patrull 1", name: "", stats: patrolStats([]) },
}

/**
 * With a carried person over it.
 */
export const Over: Story = { args: { isOver: true } }

/**
 * Past what a patrol holds, so its meter says so.
 */
export const Overfull: Story = {
  args: {
    children: chips(patrolSize + 1),
    stats: patrolStats(scouts.slice(0, patrolSize + 1)),
  },
}
