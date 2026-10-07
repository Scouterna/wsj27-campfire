import type { Role } from "@scouterna/wsj27-campfire-utils"
import { useId, useState, type ReactElement } from "react"

import { unreadMessages, type Message, type MessageKind } from "../../../model/messages"
import { useClosedMessages } from "./use-closed-messages"

import "./MessagesWidget.css"

/**
 * The messages to choose from, and the roles of the reader they are chosen for.
 */
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

// Constructed once, because a formatter is expensive to build and free to reuse.
const swedishDate = new Intl.DateTimeFormat("sv-SE", { dateStyle: "long" })

// The word over a message's title, so a new kind adds a word rather than a type
// treatment. A welcome has none, because it introduces Campfire rather than reporting
// anything, and wears the big title instead.
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
 * How long a closed plate takes to fold away.
 */
const foldDuration = 250

/**
 * What takes the focus when a plate that held it goes away: the next thing a keyboard
 * reaches after the plate, or the last one before it at the end of the page.
 * @param plate The plate going away.
 * @returns The element to focus, or undefined when the page has nothing else to reach.
 */
function focusAfter(plate: HTMLElement): HTMLElement | undefined {
  const reachable = [
    ...document.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])",
    ),
  ].filter((element) => !plate.contains(element) && element.closest("[inert]") === null)
  const next = reachable.find(
    (element) => (plate.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
  )
  return (
    next ??
    reachable.findLast(
      (element) =>
        (plate.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_PRECEDING) !== 0,
    )
  )
}

/**
 * Folds a closed plate away – its height, its padding, and the gap after it closing
 * together while it fades – and only then forgets it, so what is below glides up into its
 * place rather than jumping, as a deleted row does in a native list. The focus, where the
 * plate held it, goes on to what follows.
 * @param plate The plate closed.
 * @param forget What removes the plate for good, once it has folded away.
 */
function fold(plate: HTMLElement, forget: () => void): void {
  if (plate.contains(document.activeElement)) {
    focusAfter(plate)?.focus({ preventScroll: true })
  }
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    forget()
    return
  }
  const style = getComputedStyle(plate)
  // The column the plates stand in spaces them with a gap, which has to close with the
  // plate or the plates below land a gap short and jump the rest of the way.
  const parent = plate.parentElement
  // A computed gap carries its unit, which `Number` refuses.
  // eslint-disable-next-line unicorn/prefer-number-coercion -- see above
  const gap = parent === null ? 0 : Number.parseFloat(getComputedStyle(parent).rowGap) || 0
  plate.classList.add("messages-folding")
  const animation = plate.animate(
    [
      {
        height: `${String(plate.offsetHeight)}px`,
        marginBottom: "0px",
        opacity: 1,
        paddingBlock: style.paddingBlock,
      },
      { height: "0px", marginBottom: `${String(-gap)}px`, opacity: 0, paddingBlock: "0px" },
    ],
    { duration: foldDuration, easing: "ease", fill: "forwards" },
  )
  animation.addEventListener("finish", forget)
}

/**
 * The contingent's unread messages on the start screen, a plate each, because the kinds
 * do not belong under one heading or behind one close control. The welcome wears the
 * theme's bright fill, as the sign-in hero does, because it is the contingent speaking
 * rather than a block of data. Every title is an `h2`, which lists the plates in the
 * page outline.
 *
 * The moment is read once when the widget mounts, so a message whose end passes while
 * the reader looks at it stays until the start screen next opens rather than vanishing
 * under them.
 *
 * @param props The message list, and the reader's roles.
 * @returns The plates, or nothing when no message is unread.
 */
export function MessagesWidget(props: MessagesWidgetProps): ReactElement | null {
  const prefix = useId()
  const { close, closed } = useClosedMessages()
  const [openedAt] = useState(() => new Date())
  const unread = unreadMessages(props.messages, props.roles, closed, openedAt)
  if (unread.length === 0) {
    return null
  }

  return (
    <>
      {unread.map((message) => {
        const headingId = `${prefix}-${message.id}`
        const label = labelByKind[message.kind]
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
                onClick={(event) => {
                  const plate = event.currentTarget.closest("section")
                  if (plate === null) {
                    close(message.id)
                    return
                  }
                  fold(plate, () => {
                    close(message.id)
                  })
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
