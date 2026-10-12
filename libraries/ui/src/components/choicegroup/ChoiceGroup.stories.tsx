import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState, type ReactElement } from "react"
import { fn } from "storybook/test"

import { ColumnDecorator } from "../../storybook/ColumnDecorator"
import { ChoiceGroup, type ChoiceGroupOption } from "./ChoiceGroup"

const options: readonly ChoiceGroupOption<string>[] = [
  {
    description: "Det vanliga. Ärendet kan också delas med enskilda personer.",
    label: "Hälsoteamet",
    value: "3",
  },
  {
    description: "Ärendet kan aldrig delas med någon annan.",
    label: "Bara hälsoteamet",
    value: "4",
  },
  { description: "Ingen annan ser ärendet, om du inte delar det.", label: "Bara du", value: "5" },
]

/**
 * The group with its own state, so a story can be clicked through.
 * @param props The value to start from.
 * @param props.initial The value in force at first, or undefined for none.
 * @returns The group under its question.
 */
function Stateful(props: { readonly initial: string | undefined }): ReactElement {
  const [value, setValue] = useState(props.initial)
  return (
    <>
      <p id="choice-story-label">Vem ser ärendet?</p>
      <ChoiceGroup
        labelledBy="choice-story-label"
        onChange={setValue}
        options={options}
        value={value}
      />
    </>
  )
}

const meta = {
  title: "Components/ChoiceGroup",
  decorators: [ColumnDecorator],
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const Chosen: Story = {
  render: (): ReactElement => <Stateful initial="3" />,
}

export const NothingChosen: Story = {
  render: (): ReactElement => <Stateful initial={undefined} />,
}

export const SideBySide: Story = {
  render: (): ReactElement => (
    <>
      <p id="choice-story-row-label">Typ av ärende</p>
      <ChoiceGroup
        labelledBy="choice-story-row-label"
        layout="row"
        onChange={fn()}
        options={[
          { label: "Hälsa", value: "hälsa" },
          { label: "CMT", value: "cmt" },
        ]}
        value="hälsa"
      />
    </>
  ),
}
