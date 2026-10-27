import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState, type ReactElement } from "react"

import { Select, type SelectOption, type SelectVariant } from "./Select"

const options: readonly SelectOption<string>[] = [
  { label: "Alla", value: "3" },
  { label: "Bara hälsoteamet", value: "4" },
  { label: "Bara du", value: "5" },
]

/**
 * The select with its own state, so a story can be changed.
 * @param props How it stands among the controls beside it.
 * @param props.variant Filled or plain.
 * @returns The select.
 */
function Stateful(props: { readonly variant?: SelectVariant }): ReactElement {
  const [value, setValue] = useState("3")
  return (
    <Select
      label="Vem ser anteckningen?"
      onChange={setValue}
      options={options}
      value={value}
      variant={props.variant}
    />
  )
}

const meta = {
  title: "Components/Select",
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (): ReactElement => <Stateful />,
}

export const Plain: Story = {
  render: (): ReactElement => <Stateful variant="plain" />,
}
