import { hasAnyRole, type Role } from "@scouterna/wsj27-campfire-utils"

/**
 * What kind of thing a message is, which decides how loudly the plate says it. A
 * welcome introduces Campfire and is the only one that proclaims, and the others report,
 * told apart by their label.
 */
export type MessageKind = "important" | "news" | "welcome"

/**
 * Something the contingent says to the people who open Campfire. The id is what a
 * closed message is remembered by, so it never changes once a message has shipped – a
 * message reissued later gets a new id and shows again.
 */
export interface Message {
  /**
   * The roles it is for, in the application's own role kinds, so whoever holds one of
   * them reads it. Never empty, because a message for nobody is a message nobody can
   * close.
   */
  readonly audience: readonly Role["kind"][]
  /**
   * The day it was written, as an ISO date. Absent on a welcome, which is not news and
   * wants no timestamp – for the other kinds the plate draws it beside the label.
   */
  readonly date?: string
  /**
   * The moment it stops showing, written with Sweden's offset on that day. Absent means
   * five days after the start.
   */
  readonly end?: Date
  /**
   * The message's identity, carrying the month it shipped so a reissue has an obvious
   * next name.
   */
  readonly id: string
  /**
   * How much weight the message carries, which the plate draws rather than the words.
   */
  readonly kind: MessageKind
  /**
   * What the message says, one entry per paragraph. Plain text – the plate draws each
   * entry as its own paragraph, so a message longer than a few sentences can breathe.
   */
  readonly paragraphs: readonly string[]
  /**
   * The moment it starts showing, written with Sweden's offset on that day – +01:00 in
   * winter, +02:00 in summer – so the moment is the same wherever the device stands.
   */
  readonly start: Date
  /**
   * The message's heading.
   */
  readonly title: string
}

/**
 * How long a message shows when it sets no end – five days of 24 hours, so a change to
 * or from summer time in between moves the end on the wall clock rather than the length.
 */
export const defaultMessageDuration = 5 * 24 * 60 * 60 * 1000

/**
 * Where the closed ids live between visits – per device rather than per person, so a
 * message closed once stays closed through a sign-out.
 */
export const closedMessagesKey = "campfire.messages.closed"

/**
 * Every message the start screen can show, oldest first. A new message is another
 * entry at the end, and shows alone to everyone in its audience who closed the earlier
 * ones.
 *
 * The welcome comes once per role, because it says only what the reader can do here,
 * and that differs – the management's says nothing of allergies, which most of them
 * cannot read. Both sit under a page title that already says välkommen, so their own
 * title says something else. Somebody who holds both roles reads both, because each is
 * true for them.
 *
 * The contact note goes to both roles, because both write to the addresses it is
 * about. It says what was wrong rather than how the reading works, because a leader
 * cannot act on which source we prefer.
 */
export const messages: readonly Message[] = [
  {
    audience: ["leader"],
    id: "welcome-leader-2026-09",
    kind: "welcome",
    paragraphs: [
      "Campfire är kontingentens egen app. Här ser du din avdelning – vilka som är med, " +
        "hur du når dem och deras närstående, och vilka allergier du behöver ha koll på. " +
        "Du kan mejla hela avdelningen på en gång och följa nedräkningen till avresan. " +
        "Mer är på väg och när det kommer något nytt säger vi till på Discord.",
    ],
    start: new Date("2026-09-19T19:30:00+02:00"),
    title: "Det här är Campfire!",
  },
  {
    audience: ["cmt"],
    id: "welcome-cmt-2026-09",
    kind: "welcome",
    paragraphs: [
      "Campfire är kontingentens egen app. Här hittar du alla deltagare – sök bland dem, " +
        "bläddra bland avdelningarna och gå in på en avdelning för att se vilka som är " +
        "med. Du kan mejla dem du har i listan och följa nedräkningen till avresan. Mer " +
        "är på väg och när det kommer något nytt säger vi till på Teams.",
    ],
    start: new Date("2026-09-19T19:30:00+02:00"),
    title: "Det här är Campfire!",
  },
  {
    audience: ["cmt", "leader"],
    date: "2026-09-20",
    id: "contact-details-2026-09",
    kind: "important",
    paragraphs: [
      "Kontaktuppgifterna kunde i vissa fall visa det som fanns i Scoutnet vid anmälan i " +
        "stället för det som gäller nu. Nu visas alltid de aktuella uppgifterna. Beklagar " +
        "om något mejl gått till fel adress.",
      "Det som hette närstående i listan heter nu kontaktpersoner – när du mejlar eller " +
        "kopierar adresserna tar vi med både närstående och nödkontakter.",
    ],
    start: new Date("2026-09-20T21:00:00+02:00"),
    title: "Vi har rättat kontaktuppgifterna",
  },
]

/**
 * The messages a reader should see at a moment – those for a role they hold, showing at
 * that moment, and not closed on this device. A message shows from its start up to but
 * not including its end, and one with an invalid date never shows. A closed id the
 * list does not hold changes nothing.
 * @param list The messages to choose from.
 * @param roles The roles the reader holds.
 * @param closed The ids this device has closed.
 * @param at The moment to choose for, passed in rather than read so a test can place it.
 * @returns The unread messages for the reader, in list order.
 */
export function unreadMessages(
  list: readonly Message[],
  roles: readonly Role[],
  closed: ReadonlySet<string>,
  at: Date,
): readonly Message[] {
  const moment = at.getTime()
  return list.filter(
    (message) =>
      hasAnyRole(roles, ...message.audience) &&
      isShowing(message, moment) &&
      !closed.has(message.id),
  )
}

/**
 * Whether a message shows at a moment. An invalid date's time is NaN, which every
 * comparison refuses.
 * @param message The message to test.
 * @param moment The moment, in milliseconds since the epoch.
 * @returns True from the start up to but not including the end.
 */
function isShowing(message: Message, moment: number): boolean {
  const start = message.start.getTime()
  const end = message.end === undefined ? start + defaultMessageDuration : message.end.getTime()
  return start <= moment && moment < end
}

/**
 * The closed ids, from whatever storage holds. Storage is not trusted, so a missing
 * value, broken JSON, and a shape somebody else wrote all read as nothing closed, and
 * an array keeps only its strings, because a message shown twice beats a start screen
 * that will not render. Never throws.
 * @param stored The raw stored value, or undefined when the key is absent.
 * @returns The ids that were closed.
 */
export function parseClosedMessages(stored: string | undefined): ReadonlySet<string> {
  if (stored === undefined || stored === "") {
    return new Set()
  }
  try {
    const parsed: unknown = JSON.parse(stored)
    return new Set(
      Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [],
    )
  } catch {
    return new Set()
  }
}
