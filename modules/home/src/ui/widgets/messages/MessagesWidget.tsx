import type { Role } from "@scouterna/wsj27-campfire-utils"
import { useId, type ReactElement } from "react"

import { unreadMessages, type Message, type MessageKind } from "../../../model/messages"
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

// Constructed once: a formatter is expensive to build and free to reuse.
const swedishDate = new Intl.DateTimeFormat("sv-SE", { dateStyle: "long" })

// The word over a message's title, which is how a fourth kind arrives later without a
// fourth type treatment – it adds a word rather than a design. A welcome has none: it
// introduces Campfire rather than reporting anything, and wears the big title instead.
const labelByKind: Partial<Readonly<Record<MessageKind, string>>> = {
  important: "Viktigt",
  news: "Nyhet",
}

/**
 * The day a message was written, as it is read rather than as it is stored.
 * @param date The ISO date the message carries.
 * @returns The date in words.
 */
function written(date: string): string {
  // Parsed as local midnight rather than as the bare date, which is UTC midnight and
  // lands on the day before in any zone behind it.
  return swedishDate.format(new Date(`${date}T00:00:00`))
}

/**
 * The contingent's messages on the start screen – each one its own plate, with its label
 * and date, its title, its paragraphs, and the one control that closes it.
 *
 * A plate per message, because the kinds do not belong under one heading or behind one
 * close control. The welcome proclaims, and wears the sign-in hero's bright fill because
 * it is the contingent speaking rather than a block of data; an important one has to be
 * noticed without being celebrated, and news is quiet, so both report from the theme's
 * quieter wash. A different surface rather than a smaller title on the same one: size
 * within one surface is what a subheading is. Every title is an `h2`, which is what lists
 * the plates in the page outline. Nothing at all once everything is closed.
 *
 * @param props The message list, and the reader's roles.
 * @returns The plates, or nothing when no message is unread.
 */
export function MessagesWidget(props: MessagesWidgetProps): ReactElement | null {
  const prefix = useId()
  const { close, closed } = useClosedMessages()
  const unread = unreadMessages(props.messages, props.roles, closed)
  if (unread.length === 0) {
    return null
  }

  return (
    <>
      {unread.map((message) => {
        const headingId = `${prefix}-${message.id}`
        const label = labelByKind[message.kind]
        // The welcome proclaims and every other kind reports, which is a different
        // surface rather than a smaller title on the same one.
        const isWelcome = message.kind === "welcome"
        return (
          <section
            aria-labelledby={headingId}
            className={isWelcome ? "messages" : "messages messages-quiet"}
            key={message.id}
          >
            <div className="messages-heading">
              <div className="messages-lead">
                {label === undefined ? null : (
                  <p className="messages-label">
                    {label}
                    {message.date === undefined ? null : ` · ${written(message.date)}`}
                  </p>
                )}
                <h2
                  className={
                    isWelcome ? "messages-headline" : "messages-headline messages-headline-quiet"
                  }
                  id={headingId}
                >
                  {message.title}
                </h2>
              </div>
              <button
                // The name opens with the visible word, which is what speech control matches.
                aria-label="Stäng meddelandet"
                className="messages-close"
                onClick={() => {
                  close(message.id)
                }}
                type="button"
              >
                Stäng
              </button>
            </div>
            {message.paragraphs.map((paragraph) => (
              <p className="messages-text" key={paragraph}>
                {paragraph}
              </p>
            ))}
          </section>
        )
      })}
    </>
  )
}
