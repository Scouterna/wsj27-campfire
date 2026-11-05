import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { unitInPatrols } from "../../storybook/cast"
import { PatrolMember } from "./PatrolMember"
import { Tray } from "./Tray"

const person = unitInPatrols(0).people.find((member) => member.role === "deltagare")

const meta: Meta<typeof Tray> = {
  title: "Modules/Participants/Components/Tray",
  component: Tray,
  args: {
    children:
      person === undefined ? null : (
        <PatrolMember
          isCarried={false}
          isLanded={false}
          isSelected={false}
          moves={[]}
          onOpenCare={fn()}
          onPointerDown={fn()}
          onToggle={fn()}
          person={person}
        />
      ),
    count: 1,
    isOver: false,
  },
}

export default meta

type Story = StoryObj<typeof Tray>

/**
 * Somebody waiting for a patrol.
 */
export const Waiting: Story = {}

/**
 * Everybody placed, which says where a person is put to take them out again.
 */
export const Empty: Story = { args: { children: null, count: 0 } }

/**
 * A carried person over it, so it says it will take them.
 */
export const Over: Story = { args: { isOver: true } }
