import type { Meta, StoryObj } from "@storybook/react-vite"

import { unitInPatrols } from "../../storybook/cast"
import { Carried } from "./Carried"

const person = unitInPatrols().people.at(0)

const meta: Meta<typeof Carried> = {
  title: "Modules/Participants/Components/Carried",
  component: Carried,
  args: {
    alongside: 0,
    drag: { memberNo: "1", width: 240, x: 24, y: 24 },
    ...(person !== undefined && { person }),
  },
}

export default meta

type Story = StoryObj<typeof Carried>

/**
 * One person under the pointer.
 */
export const Alone: Story = {}

/**
 * Carried with others, which the copy counts.
 */
export const WithOthers: Story = { args: { alongside: 3 } }
