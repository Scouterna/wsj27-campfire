import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState, type ReactElement } from "react"

import { CopyIcon } from "../../foundations/icons/set/CopyIcon"
import { MailIcon } from "../../foundations/icons/set/MailIcon"
import { OverflowMenu } from "./OverflowMenu"

const meta: Meta<typeof OverflowMenu> = {
  title: "Components/OverflowMenu",
  component: OverflowMenu,
}

export default meta

type Story = StoryObj<typeof OverflowMenu>

/**
 * The page's extra actions behind the round glass trigger: press it to open, choose
 * or press outside to close. The story counts what was chosen.
 */
export const Default: Story = {
  render: function DefaultStory(): ReactElement {
    const [chosen, setChosen] = useState("ingenting")

    return (
      <div className="story-stack">
        <OverflowMenu
          items={[
            {
              label: "Visa i Deltagare",
              onSelect: () => {
                setChosen("Visa i Deltagare")
              },
            },
            "divider",
            {
              label: "Påminn om rapport",
              onSelect: () => {
                setChosen("Påminn om rapport")
              },
            },
          ]}
        />
        <span className="story-readout">Senast valt: {chosen}</span>
      </div>
    )
  },
}

/**
 * An entry that opens an address the browser hands to another application – here a new
 * mail – rather than something the page does or somewhere the router goes.
 */
export const Address: Story = {
  args: {
    items: [
      { href: "mailto:?bcc=anna@example.se,johan@example.se", label: "Mejla avdelningen" },
      { href: "tel:0701234567", label: "Ring jourtelefonen" },
    ],
  },
}

/**
 * An entry that cannot be chosen right now stays in the menu and says why: the arrow
 * keys still stop at it, and choosing it does nothing.
 */
export const Unavailable: Story = {
  args: {
    items: [
      {
        icon: <MailIcon size={20} />,
        label: "Mejla personerna i listan",
        unavailable: "För många adresser för ett mejl – kopiera dem i stället.",
      },
      {
        icon: <CopyIcon size={20} />,
        label: "Kopiera e-postadresserna",
        onSelect: (): void => {
          // The story is about the entry above; this one only keeps it company.
        },
      },
    ],
  },
}

/**
 * Icons on some entries indent the rest, so every label starts on the same line – and
 * two unavailable entries in a row still read as two entries, each reason belonging to
 * the label above it.
 */
export const Icons: Story = {
  render: () => (
    <div className="story-trailing">
      <OverflowMenu
        items={[
          {
            href: "mailto:?bcc=anna@example.se",
            icon: <MailIcon size={20} />,
            label: "Mejla personerna i listan",
          },
          {
            icon: <CopyIcon size={20} />,
            label: "Kopiera e-postadresserna",
            onPerform: () => Promise.resolve({ words: "59 adresser kopierade" }),
          },
          "divider",
          { label: "Mejla deras närstående", unavailable: "Inga e-postadresser i listan." },
          {
            label: "Kopiera närståendes e-postadresser",
            unavailable: "Inga e-postadresser i listan.",
          },
        ]}
      />
    </div>
  ),
}

/**
 * Work that answers: the menu stays open, the entry says what the work came to over its
 * faded label, and the menu closes two seconds later. The second entry fails. Placed as
 * the chrome places it, so the panel is only as wide as its entries – and holds that
 * width while the longest of them speaks.
 */
export const Receipt: Story = {
  render: () => (
    <div className="story-trailing">
      <OverflowMenu
        items={[
          {
            label: "Kopiera e-postadresserna",
            onPerform: () => Promise.resolve({ words: "8 adresser kopierade" }),
          },
          {
            label: "Kopiera närståendes e-postadresser",
            onPerform: () => Promise.resolve({ isFailure: true, words: "Kunde inte kopieras" }),
          },
        ]}
      />
    </div>
  ),
}
