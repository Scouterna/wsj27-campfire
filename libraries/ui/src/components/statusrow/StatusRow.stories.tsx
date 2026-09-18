import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { Card } from "../card/Card"
import { StatusRow } from "./StatusRow"

const meta: Meta<typeof StatusRow> = {
  title: "Components/StatusRow",
  component: StatusRow,
}

export default meta

type Story = StoryObj<typeof StatusRow>

/**
 * A yes, with the year it happened as its trailing pill.
 */
export const Yes: Story = {
  render: (): ReactElement => (
    <div className="story-column">
      <Card>
        <StatusRow label="Difteri påfylld" state="yes" trailing="2019" />
      </Card>
    </div>
  ),
}

/**
 * An explicit no.
 */
export const No: Story = {
  render: (): ReactElement => (
    <div className="story-column">
      <Card>
        <StatusRow label="Stelkramp ej påfylld i vuxen ålder" state="no" />
      </Card>
    </div>
  ),
}

/**
 * Unanswered draws its own trailer, whatever `trailing` says.
 */
export const Unanswered: Story = {
  render: (): ReactElement => (
    <div className="story-column">
      <Card>
        <StatusRow label="Difteri påfylld" state="unanswered" trailing="2019" />
      </Card>
    </div>
  ),
}

/**
 * The three together, as a card lists them.
 */
export const AsAList: Story = {
  render: (): ReactElement => (
    <div className="story-column">
      <Card title="Vaccinationer">
        <div className="story-stack">
          <StatusRow label="Barnvaccinationsprogrammet" state="yes" />
          <StatusRow label="Difteri påfylld" state="yes" trailing="2019" />
          <StatusRow label="Stelkramp påfylld" state="unanswered" />
        </div>
      </Card>
    </div>
  ),
}
