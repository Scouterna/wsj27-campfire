import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"
import { fn } from "storybook/test"

import { careOf } from "../../../model/Care"
import { unitInPatrolsDetails } from "../../storybook/cast"
import { PatrolMember, type PatrolMemberProps } from "./PatrolMember"

const details = unitInPatrolsDetails()
const scout = details.find((person) => person.role === "deltagare")
const allergic = details.at(5)

if (scout === undefined || allergic === undefined) {
  throw new Error("The cast holds no scouts")
}

/**
 * A chip in the list that lays it out.
 * @param props The chip's own.
 * @returns The list.
 */
function InList(props: PatrolMemberProps): ReactElement {
  return (
    <ul className="patrol-members">
      <PatrolMember {...props} />
    </ul>
  )
}

const meta: Meta<typeof PatrolMember> = {
  title: "Modules/Participants/Components/PatrolMember",
  component: PatrolMember,
  args: {
    isCarried: false,
    isLanded: false,
    isSelected: false,
    moves: [{ label: "Till Falkarna", onSelect: fn() }],
    onOpenCare: fn(),
    onPointerDown: fn(),
    onToggle: fn(),
    person: scout,
  },
  render: InList,
}

export default meta

type Story = StoryObj<typeof PatrolMember>

/**
 * A scout at rest.
 */
export const Default: Story = {}

/**
 * Picked to move together with others.
 */
export const Selected: Story = { args: { isSelected: true } }

/**
 * Picked with needs, whose marks keep their pill so they still read on the chip's ink.
 */
export const SelectedWithCare: Story = {
  args: { care: { needs: ["allergy", "health"] }, isSelected: true },
}

/**
 * The chip left behind while its person is carried.
 */
export const Carried: Story = { args: { isCarried: true } }

/**
 * A scout with a serious allergy, whose leaf opens what a leader has to know.
 */
export const WithCare: Story = {
  args: {
    care: careOf(allergic.health, allergic.notes),
    person: allergic,
  },
}
