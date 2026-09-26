import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import type { Message } from "../../../model/messages"
import { MessagesWidget } from "./MessagesWidget"
import { forgetClosedMessages } from "./use-closed-messages"

/**
 * The widget draws a plate per message and leaves the space between them to the screen
 * it stands in, which is a column with a gap. Without one here the plates would touch,
 * which is the canvas lying about the layout rather than the layout being wrong.
 * @param Story The story being rendered.
 * @returns The story, inside the column.
 */
function ColumnDecorator(Story: () => ReactElement): ReactElement {
  return (
    <div className="story-column">
      <Story />
    </div>
  )
}

// One message of each kind, written for the catalog rather than taken from the list the
// application ships. The stories are about how a kind is drawn, so they stay true as the
// contingent's own messages come and go.
const reader = [{ kind: "leader", unitNumber: 1 }] as const
const everyone: Message["audience"] = ["cmt", "leader"]

const welcome: Message = {
  audience: everyone,
  id: "story-welcome",
  kind: "welcome",
  paragraphs: [
    "Campfire är kontingentens egen app. Här ser du din avdelning – vilka som är med, hur " +
      "du når dem, och vilka allergier du behöver ha koll på.",
  ],
  title: "Det här är Campfire!",
}

const important: Message = {
  audience: everyone,
  date: "2026-09-20",
  id: "story-important",
  kind: "important",
  paragraphs: [
    "Kontaktuppgifterna kunde i vissa fall visa det som fanns i Scoutnet vid anmälan i " +
      "stället för det som gäller nu. Nu visas alltid de aktuella uppgifterna.",
    "Beklagar om något mejl gått till fel adress.",
  ],
  title: "Vi har rättat kontaktuppgifterna",
}

const news: Message = {
  audience: everyone,
  date: "2026-09-22",
  id: "story-news",
  kind: "news",
  paragraphs: [
    "Det finns en ny version av appen i App Store och på Google Play – uppdatera, så " +
      "hänger du med.",
  ],
  title: "Dags att uppdatera appen",
}

const meta: Meta<typeof MessagesWidget> = {
  title: "Modules/Home/Widgets/MessagesWidget",
  component: MessagesWidget,
  // Closing is remembered on the device, and the canvas is a device, so without this a
  // story closed once would render nothing on every visit after it.
  beforeEach: forgetClosedMessages,
  decorators: [ColumnDecorator],
  args: { roles: reader },
}

export default meta

type Story = StoryObj<typeof MessagesWidget>

/**
 * The app introducing itself on the theme's bright fill, under the only title that
 * proclaims.
 */
export const Welcome: Story = {
  args: { messages: [welcome] },
}

/**
 * Something the reader has to notice – said rather than shouted, on the quiet surface,
 * over a label and the day it was written.
 */
export const Important: Story = {
  args: { messages: [important] },
}

/**
 * Something new to know.
 */
export const News: Story = {
  args: { messages: [news] },
}

/**
 * Every kind together, which is the arrangement the weights have to hold up in – a plate
 * each, closed one at a time, and no plate reading as a part of the one above it.
 */
export const Together: Story = {
  args: { messages: [welcome, important, news] },
}
