import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState, type ReactElement } from "react"

import { PageJumps, usePageJumps } from "./PageJumps"

const meta: Meta<typeof PageJumps> = {
  title: "Components/PageJumps",
  component: PageJumps,
}

export default meta

type Story = StoryObj<typeof PageJumps>

/**
 * The chrome's side of the declaration: whatever the page declared is read back and
 * drawn as pressable stops, the current one marked – the way the outline and the
 * phone's jump control consume it in the application.
 * @returns The readout of the declared stops.
 */
function Readout(): ReactElement {
  const declared = usePageJumps()

  if (declared === undefined) {
    return <span className="story-readout">Inga deklarerade stopp.</span>
  }
  return (
    <div className="story-stack">
      {declared.entries.map((entry, index) => (
        <button
          key={entry}
          type="button"
          onClick={() => {
            declared.onJump(index)
          }}
        >
          {index === declared.current ? `● ${entry}` : entry}
        </button>
      ))}
    </div>
  )
}

/**
 * A page declares its jump stops by rendering `PageJumps` – the component itself draws
 * nothing, and the chrome reads the declaration. Press a stop to make it current.
 */
export const Declared: Story = {
  render: function DeclaredStory(): ReactElement {
    const [current, setCurrent] = useState(0)

    return (
      <div className="story-stack">
        <PageJumps
          current={current}
          entries={["Överst", "A–D", "E–K", "L–Ö"]}
          onJump={setCurrent}
        />
        <Readout />
      </div>
    )
  },
}
