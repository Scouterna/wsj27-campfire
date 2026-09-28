import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { GenderMark } from "./GenderMark"

const meta: Meta<typeof GenderMark> = {
  title: "Modules/Participants/Components/GenderMark",
  component: GenderMark,
  args: { gender: "kvinna" },
}

export default meta

type Story = StoryObj<typeof GenderMark>

export const Kvinna: Story = {}

export const Man: Story = {
  args: { gender: "man" },
}

export const Annat: Story = {
  args: { gender: "annat" },
}

/**
 * Every sign beside the age it rides with at a row's trailing edge, and Okänt with none.
 */
export const BesideAnAge: Story = {
  render: (): ReactElement => (
    <div className="story-stack">
      <span>
        <GenderMark gender="kvinna" /> 14 år
      </span>
      <span>
        <GenderMark gender="man" /> 15 år
      </span>
      <span>
        <GenderMark gender="annat" /> 13 år
      </span>
      <span>
        <GenderMark gender="okant" /> 14 år
      </span>
    </div>
  ),
}
