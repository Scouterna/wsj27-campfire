import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { MailIcon } from "../../foundations/icons/set/MailIcon"
import { PhoneIcon } from "../../foundations/icons/set/PhoneIcon"
import { Card } from "../card/Card"
import { IconField } from "./IconField"

const meta: Meta<typeof IconField> = {
  title: "Components/IconField",
  component: IconField,
}

export default meta

type Story = StoryObj<typeof IconField>

/**
 * A value that opens something: the address is a link.
 */
export const WithLink: Story = {
  render: (): ReactElement => (
    <div className="story-column">
      <Card>
        <IconField
          href="tel:0701234567"
          icon={<PhoneIcon />}
          label="Mobiltelefon"
          value="070-123 45 67"
        />
      </Card>
    </div>
  ),
}

/**
 * A value that leads nowhere.
 */
export const PlainValue: Story = {
  render: (): ReactElement => (
    <div className="story-column">
      <Card>
        <IconField icon={<MailIcon />} label="E-post" value="anna.bjork@example.se" />
      </Card>
    </div>
  ),
}

/**
 * Nothing on record: the designed absent state, in quiet ink.
 */
export const Absent: Story = {
  render: (): ReactElement => (
    <div className="story-column">
      <Card>
        <IconField icon={<PhoneIcon />} label="Mobiltelefon" />
      </Card>
    </div>
  ),
}

/**
 * The absent state, worded for the field.
 */
export const AbsentWithOwnLabel: Story = {
  render: (): ReactElement => (
    <div className="story-column">
      <Card>
        <IconField icon={<MailIcon />} label="Alternativ e-post" missingLabel="Ingen angiven" />
      </Card>
    </div>
  ),
}

/**
 * The states together, as a contact card lists them.
 */
export const AsAList: Story = {
  render: (): ReactElement => (
    <div className="story-column">
      <Card>
        <div className="story-stack">
          <IconField
            href="mailto:anna.bjork@example.se"
            icon={<MailIcon />}
            label="E-post"
            value="anna.bjork@example.se"
          />
          <IconField
            href="tel:0701234567"
            icon={<PhoneIcon />}
            label="Mobiltelefon"
            value="070-123 45 67"
          />
          <IconField icon={<MailIcon />} label="Alternativ e-post" />
        </div>
      </Card>
    </div>
  ),
}
