import { hasAnyRole, type Role } from "@scouterna/wsj27-campfire-utils"

/**
 * Something the contingent says to the people who open Campfire. The id is what a
 * closed message is remembered by, so it never changes once a message has shipped – a
 * message reissued later gets a new id and shows again.
 */
export interface Message {
  /**
   * The roles it is for, in the application's own role kinds: whoever holds one of
   * them reads it. Never empty – a message for nobody is a message nobody can close.
   */
  readonly audience: readonly Role["kind"][]
  /**
   * The message's identity, carrying the month it shipped so a reissue has an obvious
   * next name.
   */
  readonly id: string
  /**
   * What the message says, as plain text.
   */
  readonly text: string
  /**
   * The message's heading.
   */
  readonly title: string
}

/**
 * Where the closed ids live between visits – per device rather than per person, so a
 * message closed once stays closed through a sign-out. Beside the parser that reads
 * its value.
 */
export const closedMessagesKey = "campfire.messages.closed"

/**
 * Every message the start screen can show, oldest first. The next message is another
 * entry at the end: it shows, alone, to everyone in its audience who closed the
 * earlier ones.
 *
 * The welcome comes once per role, because it says what the reader can do here and
 * that is not the same for both – and only what they can do: the management's says
 * nothing of allergies, which most of them cannot read. Each ends by naming where its
 * reader hears what is new – the leaders on Discord, the management on Teams – and
 * both sit under a page title that already says välkommen, so their own title says
 * something else. Somebody who holds both roles reads both, one under the other: each
 * is true for them, as the participants section gives them the unit and everyone.
 */
export const messages: readonly Message[] = [
  {
    audience: ["leader"],
    id: "welcome-leader-2026-09",
    text:
      "Campfire är kontingentens egen app. Här ser du din avdelning – vilka som är med, " +
      "hur du når dem och deras närstående, och vilka allergier du behöver ha koll på. " +
      "Du kan mejla hela avdelningen på en gång och följa nedräkningen till avresan. " +
      "Mer är på väg och när det kommer något nytt säger vi till på Discord.",
    title: "Det här är Campfire!",
  },
  {
    audience: ["cmt"],
    id: "welcome-cmt-2026-09",
    text:
      "Campfire är kontingentens egen app. Här hittar du alla deltagare – sök bland dem, " +
      "bläddra bland avdelningarna och gå in på en avdelning för att se vilka som är " +
      "med. Du kan mejla dem du har i listan och följa nedräkningen till avresan. Mer " +
      "är på väg och när det kommer något nytt säger vi till på Teams.",
    title: "Det här är Campfire!",
  },
]

/**
 * The messages a reader should see now: those for a role they hold that this device
 * has not closed, in the order they were added. A closed id the list does not hold
 * changes nothing, and somebody holding none of a message's roles never sees it.
 * @param list The messages to choose from.
 * @param roles The roles the reader holds.
 * @param closed The ids this device has closed.
 * @returns The unread messages for the reader, in list order.
 */
export function unreadMessages(
  list: readonly Message[],
  roles: readonly Role[],
  closed: ReadonlySet<string>,
): readonly Message[] {
  return list.filter((message) => hasAnyRole(roles, ...message.audience) && !closed.has(message.id))
}

/**
 * The closed ids, from whatever storage holds. Storage is not trusted: a missing
 * value, broken JSON, and a shape somebody else wrote all read as nothing closed, and
 * an array keeps only its strings – a message shown twice beats a start screen that
 * will not render. Never throws.
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
