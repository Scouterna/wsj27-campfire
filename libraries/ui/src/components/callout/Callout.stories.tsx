import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { IdCardIcon } from "../../foundations/icons/set/IdCardIcon"
import { MailIcon } from "../../foundations/icons/set/MailIcon"
import { Card } from "../card/Card"
import { Callout } from "./Callout"

const meta: Meta<typeof Callout> = {
  title: "Components/Callout",
  component: Callout,
}

export default meta

type Story = StoryObj<typeof Callout>

/**
 * One fact lifted out of a card.
 */
export const Default: Story = {
  render: (): ReactElement => (
    <div className="story-column">
      <Callout icon={<IdCardIcon />} title="Namn på ID-kortet">
        Anna-Karin Elisabeth Björk
      </Callout>
    </div>
  ),
}

/**
 * Where it lives: on a card, under the card's own heading.
 */
export const InACard: Story = {
  render: (): ReactElement => (
    <div className="story-column">
      <Card title="Hälsa">
        <div className="story-stack">
          <Callout icon={<MailIcon />} title="Till avdelningsledaren">
            <q>Jag har lätt för att bli åksjuk på långa bussresor.</q>
          </Callout>
          <Callout icon={<MailIcon />} title="Till kontingentledningen">
            <q>Behöver sitta längst fram i bussen.</q>
          </Callout>
        </div>
      </Card>
    </div>
  ),
}
