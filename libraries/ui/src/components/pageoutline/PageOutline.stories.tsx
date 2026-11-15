import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState, type ReactElement } from "react"

import { PageOutline } from "./PageOutline"

const meta: Meta<typeof PageOutline> = {
  title: "Components/PageOutline",
  component: PageOutline,
}

export default meta

type Story = StoryObj<typeof PageOutline>

const entries = [
  "Profil",
  "Kontakt",
  "Kost och allergier",
  "Hälsa",
  "Aktivitetsberedskap",
  "Vaccinationer",
  "Språk",
  "Erfarenhet",
]

/**
 * A page's sections listed beside it. Which one is current is the caller's – here a
 * click moves the mark, on a page it follows the scroll.
 */
export const Default: Story = {
  render: function DefaultStory(): ReactElement {
    const [current, setCurrent] = useState(0)

    return (
      <div className="story-menu">
        <PageOutline entries={entries} current={current} onSelect={setCurrent} />
      </div>
    )
  },
}

/**
 * An outline that nests, the way a handbook's chapters hold their pages – the nested
 * entries indented and a step quieter.
 */
export const Nested: Story = {
  render: function NestedStory(): ReactElement {
    const [current, setCurrent] = useState(2)

    return (
      <div className="story-menu">
        <PageOutline
          entries={[
            "Välkommen",
            { isNested: true, label: "Vad är handboken?" },
            { isNested: true, label: "Kontaktinformation" },
            "Resa",
            { isNested: true, label: "Resan till WSJ" },
            { isNested: true, label: "Adresser" },
          ]}
          current={current}
          onSelect={setCurrent}
        />
      </div>
    )
  },
}

/**
 * The label over the entries, reworded.
 */
export const OwnLabel: Story = {
  render: function OwnLabelStory(): ReactElement {
    const [current, setCurrent] = useState(2)

    return (
      <div className="story-menu">
        <PageOutline
          label="Innehåll"
          entries={entries.slice(0, 4)}
          current={current}
          onSelect={setCurrent}
        />
      </div>
    )
  },
}
