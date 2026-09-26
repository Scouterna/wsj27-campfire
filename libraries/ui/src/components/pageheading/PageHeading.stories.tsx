import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState, type ReactElement } from "react"
import { fn } from "storybook/test"

import { PageHeading } from "./PageHeading"

const meta: Meta<typeof PageHeading> = {
  title: "Components/PageHeading",
  component: PageHeading,
}

export default meta

type Story = StoryObj<typeof PageHeading>

/**
 * A section root: the title alone, in the display face – small on a phone, large from
 * desktop width.
 */
export const TitleOnly: Story = {
  args: {
    title: "Välkommen",
  },
}

/**
 * A detail screen: the parent's name behind a chevron above the title, and going back
 * is the caller's – the heading only asks.
 */
export const WithBack: Story = {
  render: function WithBackStory(): ReactElement {
    const [presses, setPresses] = useState(0)

    return (
      <div className="story-stack">
        <PageHeading
          title="Anna Björk"
          back={{
            label: "Deltagare",
            onBack: () => {
              setPresses((count) => count + 1)
            },
          }}
        />
        <span className="story-readout">Tillbaka tryckt {presses} gånger</span>
      </div>
    )
  },
}

/**
 * The title row's actions, from desktop width: the page's one primary action, and the
 * overflow menu behind the rest. A phone carries them in its bar and its floating
 * button instead, so both hide below the breakpoint.
 */
export const WithActions: Story = {
  args: {
    title: "Min avdelning",
    action: { label: "Öppna ärende", onPress: fn() },
    menu: [
      { label: "Visa i Deltagare", onSelect: fn() },
      "divider",
      { label: "Påminn om rapport", onSelect: fn() },
    ],
  },
}
