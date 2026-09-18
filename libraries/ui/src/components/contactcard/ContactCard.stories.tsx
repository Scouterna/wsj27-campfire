import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { ContactCard } from "./ContactCard"

const meta: Meta<typeof ContactCard> = {
  title: "Components/ContactCard",
  component: ContactCard,
}

export default meta

type Story = StoryObj<typeof ContactCard>

/**
 * Someone with a phone: the action calls.
 */
export const Call: Story = {
  render: (): ReactElement => (
    <div className="story-column">
      <ContactCard
        action={{ kind: "call", href: "tel:0702345678" }}
        detail="070-234 56 78 · maria@example.se"
        name="Maria Björk"
        overline="Närstående 1 · Vårdnadshavare"
      />
    </div>
  ),
}

/**
 * Someone with only an address: the action mails.
 */
export const Mail: Story = {
  render: (): ReactElement => (
    <div className="story-column">
      <ContactCard
        action={{ kind: "mail", href: "mailto:johan@example.se" }}
        detail="johan@example.se"
        name="Johan Björk"
        overline="Närstående 2"
      />
    </div>
  ),
}

/**
 * A name and nothing else: without a way to reach them the card carries no action.
 */
export const NothingToReach: Story = {
  render: (): ReactElement => (
    <div className="story-column">
      <ContactCard name="Per Lindqvist" overline="Sekundär nödkontakt" />
    </div>
  ),
}

/**
 * How the cards read together.
 */
export const AsAList: Story = {
  render: (): ReactElement => (
    <div className="story-column">
      <ContactCard
        action={{ kind: "call", href: "tel:0733456789" }}
        detail="073-345 67 89"
        name="Karin Lindqvist"
        overline="Primär nödkontakt · Sambo"
      />
      <ContactCard name="Per Lindqvist" overline="Sekundär nödkontakt" />
      <ContactCard
        action={{ kind: "call", href: "tel:0702345678" }}
        detail="070-234 56 78 · maria@example.se"
        name="Maria Björk"
        overline="Närstående 1 · Vårdnadshavare"
      />
    </div>
  ),
}
