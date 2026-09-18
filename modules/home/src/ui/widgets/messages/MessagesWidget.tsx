import type { Role } from "@scouterna/wsj27-campfire-utils"
import { useId, type ReactElement } from "react"

import { unreadMessages, type Message } from "../../../model/messages"
import { useClosedMessages } from "./use-closed-messages"

import "./MessagesWidget.css"

export interface MessagesWidgetProps {
  /**
   * The message list to show the unread part of, oldest first.
   */
  readonly messages: readonly Message[]
  /**
   * The roles the reader holds, which decide which messages are theirs.
   */
  readonly roles: readonly Role[]
}

/**
 * The contingent's messages on the start screen, as one plate in the theme's bright
 * color with everything on it – the headline in the display face, the text, and the
 * one close control. It is the contingent speaking rather than a block of data, so it
 * wears the sign-in hero's colors instead of a card's white sheet. Every message for
 * the reader that this device has not closed is read together and closed together, so
 * a message added later comes back alone. The first title is an `h2`, which is what
 * lists the plate in the page outline. Nothing at all once everything is closed.
 *
 * @param props The message list, and the reader's roles.
 * @returns The plate, or nothing when no message is unread.
 */
export function MessagesWidget(props: MessagesWidgetProps): ReactElement | null {
  const headlineId = useId()
  const { close, closed } = useClosedMessages()
  const unread = unreadMessages(props.messages, props.roles, closed)
  const [first, ...later] = unread
  if (first === undefined) {
    return null
  }

  return (
    <section aria-labelledby={headlineId} className="messages">
      <div className="messages-heading">
        <h2 className="messages-headline" id={headlineId}>
          {first.title}
        </h2>
        <button
          // The name opens with the visible word, which is what speech control matches.
          aria-label={later.length === 0 ? "Stäng meddelandet" : "Stäng meddelandena"}
          className="messages-close"
          onClick={() => {
            close(unread.map((message) => message.id))
          }}
          type="button"
        >
          Stäng
        </button>
      </div>
      <p className="messages-text">{first.text}</p>
      {later.map((message) => (
        <div className="messages-later" key={message.id}>
          <h3 className="messages-title">{message.title}</h3>
          <p className="messages-text">{message.text}</p>
        </div>
      ))}
    </section>
  )
}
