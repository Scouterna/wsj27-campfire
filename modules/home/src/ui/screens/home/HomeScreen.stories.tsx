import { Card, ScreenDecorator, WidgetsProvider } from "@scouterna/wsj27-campfire-ui"
import { RolesProvider } from "@scouterna/wsj27-campfire-utils"
import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { HomeScreen } from "./HomeScreen"

const meta = {
  title: "Modules/Home/Screens/HomeScreen",
  component: HomeScreen,
  decorators: [ScreenDecorator],
  parameters: {
    // A screen fills the frame, as sign-in's does – the decorator draws the page
    // surface, so the canvas adds no padded box around it.
    layout: "fullscreen",
  },
} satisfies Meta<typeof HomeScreen>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

// Stand-ins for the other modules' widgets: home places by id and never imports the
// modules that fill them, and neither does its story.
const standIns = {
  "journey:countdown": (): ReactElement => (
    <Card title="Resan">
      <p className="story-filler">Resans nedräkning, från journey-modulen.</p>
    </Card>
  ),
  "participants:unit": (): ReactElement => (
    <Card title="Min avdelning">
      <p className="story-filler">Ledarens avdelning, från participants-modulen.</p>
    </Card>
  ),
}

/**
 * A leader's start screen, with every widget registered.
 */
export const LeaderWithWidgets: Story = {
  render: (): ReactElement => (
    <RolesProvider roles={[{ kind: "leader", unitNumber: 1 }]}>
      <WidgetsProvider widgets={standIns}>
        <HomeScreen />
      </WidgetsProvider>
    </RolesProvider>
  ),
}

/**
 * Anybody else's: the unit widget is a leader's alone.
 */
export const WithWidgets: Story = {
  render: (): ReactElement => (
    <WidgetsProvider widgets={standIns}>
      <HomeScreen />
    </WidgetsProvider>
  ),
}
