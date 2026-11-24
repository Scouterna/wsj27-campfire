import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { GenderMark } from "../gender/GenderMark"
import { PictureMark } from "./PictureMark"

const meta: Meta<typeof PictureMark> = {
  title: "Modules/Participants/Components/PictureMark",
  component: PictureMark,
}

export default meta

type Story = StoryObj<typeof PictureMark>

export const Alone: Story = {}

/**
 * The sign leading the facts at a row's trailing edge, with and without a gender.
 */
export const BesideTheFacts: Story = {
  render: (): ReactElement => (
    <div className="story-stack">
      <span>
        <PictureMark /> <GenderMark gender="kvinna" /> 14 år
      </span>
      <span>
        <PictureMark /> 15 år
      </span>
    </div>
  ),
}
