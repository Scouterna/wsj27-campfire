import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState, type ReactElement } from "react"

import { SearchField } from "./SearchField"

const meta: Meta<typeof SearchField> = {
  title: "Components/SearchField",
  component: SearchField,
}

export default meta

type Story = StoryObj<typeof SearchField>

/**
 * The empty field, showing its hint. The caller owns the text.
 */
export const Empty: Story = {
  render: function EmptyStory(): ReactElement {
    const [value, setValue] = useState("")

    return (
      <div className="story-column">
        <SearchField
          label="Sök deltagare"
          onChange={(event) => {
            setValue(event.target.value)
          }}
          placeholder="Sök deltagare"
          value={value}
        />
      </div>
    )
  },
}

/**
 * With something typed in it.
 */
export const Filled: Story = {
  render: function FilledStory(): ReactElement {
    const [value, setValue] = useState("Björk")

    return (
      <div className="story-column">
        <SearchField
          label="Sök deltagare"
          onChange={(event) => {
            setValue(event.target.value)
          }}
          placeholder="Sök deltagare"
          value={value}
        />
      </div>
    )
  },
}

/**
 * The trailing slot – a count of what the search left.
 */
export const WithTrailing: Story = {
  render: function WithTrailingStory(): ReactElement {
    const [value, setValue] = useState("Björk")

    return (
      <div className="story-column">
        <SearchField
          label="Sök deltagare"
          onChange={(event) => {
            setValue(event.target.value)
          }}
          placeholder="Sök deltagare"
          trailing={<span className="story-readout">3 träffar</span>}
          value={value}
        />
      </div>
    )
  },
}
