import {
  RevealProvider,
  ScreenDecorator,
  unitsReveal,
  type Reveal,
} from "@scouterna/wsj27-campfire-ui"
import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { ApiDecorator, type ApiParameters } from "../../storybook/ApiDecorator"
import { targetRows } from "../../storybook/fixtures"
import { ImpersonationScreen } from "./ImpersonationScreen"

const meta = {
  title: "Modules/Authentication/Screens/ImpersonationScreen",
  component: ImpersonationScreen,
  decorators: [ApiDecorator, ScreenDecorator],
  parameters: {
    // A screen fills the frame, because the decorator draws the page surface, so the
    // canvas adds no padded box around it.
    layout: "fullscreen",
  },
} satisfies Meta<typeof ImpersonationScreen>

export default meta

type Story = StoryObj<typeof meta>

// The units reveal, still a long way off – hung in a provider of its own, because
// outside one every curtain reads as open.
const closed: readonly Reveal[] = [{ ...unitsReveal, at: new Date("2999-01-01T00:00:00Z") }]

// Each story says what the services answer rather than the meta, because Storybook merges
// a story's parameters into the meta's, so a list seeded there would reach every story.
const everybody = { offered: true, targets: targetRows } satisfies ApiParameters

export const Everybody: Story = {
  parameters: { api: everybody },
}

export const BeforeTheReveal: Story = {
  parameters: { api: everybody },
  render: (): ReactElement => (
    <RevealProvider reveals={closed}>
      <ImpersonationScreen />
    </RevealProvider>
  ),
}

export const NotOfferedHere: Story = {
  parameters: { api: { offered: false } satisfies ApiParameters },
}

export const Loading: Story = {
  parameters: { api: { offered: true, state: "pending" } satisfies ApiParameters },
}

export const Failed: Story = {
  parameters: { api: { offered: true, state: "error" } satisfies ApiParameters },
}
