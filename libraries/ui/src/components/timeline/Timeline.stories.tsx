import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { Timeline, TimelineEntry } from "./Timeline"

const meta: Meta<typeof Timeline> = {
  title: "Components/Timeline",
  component: Timeline,
}

export default meta

type Story = StoryObj<typeof Timeline>

/**
 * A closed case's history: the closing, two notes, and the opening.
 */
export const Default: Story = {
  render: (): ReactElement => (
    <Timeline label="Anteckningar">
      <TimelineEntry at={new Date(2027, 7, 5, 8, 15)} isEvent title="Ärendet avslutades">
        Helena Hägg avslutade ärendet.
      </TimelineEntry>
      <TimelineEntry at={new Date(2027, 7, 1, 16, 40)} title="Helena Hägg (du)">
        Tova är pigg igen efter två timmar i skuggan och en liter vätskeersättning.
      </TimelineEntry>
      <TimelineEntry at={new Date(2027, 7, 1, 12, 30)} title="Henrik Holm">
        Tova blev yr och illamående under lägerbygget. Hon vilar i sjukvårdstältet.
      </TimelineEntry>
      <TimelineEntry at={new Date(2027, 7, 1, 12, 20)} isEvent title="Ärendet skapades">
        Henrik Holm skapade ärendet.
      </TimelineEntry>
    </Timeline>
  ),
}
