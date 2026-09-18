import type { Meta, StoryObj } from "@storybook/react-vite"

import { messages } from "../../../model/messages"
import { MessagesWidget } from "./MessagesWidget"
import { forgetClosedMessages } from "./use-closed-messages"

const meta: Meta<typeof MessagesWidget> = {
  title: "Modules/Home/Widgets/MessagesWidget",
  component: MessagesWidget,
  // Closing is remembered on the device, and the canvas is a device: without this a
  // story closed once would render nothing on every visit after it.
  beforeEach: forgetClosedMessages,
}

export default meta

type Story = StoryObj<typeof MessagesWidget>

/**
 * A leader's welcome: what they can do with their own unit.
 */
export const Leader: Story = {
  args: {
    messages,
    roles: [{ kind: "leader", unitNumber: 1 }],
  },
}

/**
 * The management's welcome: what they can do with everyone.
 */
export const Management: Story = {
  args: {
    messages,
    roles: [{ kind: "cmt" }],
  },
}

/**
 * Two unread at once: one plate, one close, the later message under its own title.
 */
export const Several: Story = {
  args: {
    messages: [
      ...messages,
      {
        audience: ["cmt", "leader"],
        id: "story-later",
        text: "Det finns en ny version av appen i App Store och på Google Play – uppdatera, så hänger du med.",
        title: "Dags att uppdatera appen",
      },
    ],
    roles: [{ kind: "leader", unitNumber: 1 }],
  },
}
