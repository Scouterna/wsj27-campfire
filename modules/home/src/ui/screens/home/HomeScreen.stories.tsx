import { Card, ScreenDecorator, WidgetsProvider } from "@scouterna/wsj27-campfire-ui"
import { RolesProvider } from "@scouterna/wsj27-campfire-utils"
import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import { forgetClosedMessages } from "../../widgets/messages/use-closed-messages"
import { HomeScreen } from "./HomeScreen"

const meta = {
  title: "Modules/Home/Screens/HomeScreen",
  component: HomeScreen,
  decorators: [ScreenDecorator],
  parameters: {
    // A screen fills the frame, because the decorator draws the page surface, so the
    // canvas adds no padded box around it.
    layout: "fullscreen",
  },
  // Closing is remembered on the device, and the canvas is a device, so without this the
  // screen's messages would be gone from the story the first time somebody closed them.
  beforeEach: forgetClosedMessages,
} satisfies Meta<typeof HomeScreen>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

// Stand-ins for the other modules' widgets, because home places by id and never imports
// the modules that fill them, and neither does its story.
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
 * Anybody else's start screen, without the unit widget, which is a leader's alone.
 */
export const WithWidgets: Story = {
  render: (): ReactElement => (
    <WidgetsProvider widgets={standIns}>
      <HomeScreen />
    </WidgetsProvider>
  ),
}
