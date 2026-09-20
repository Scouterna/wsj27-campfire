import { contactSlots, type Participant } from "./Participant"

/**
 * Whose addresses are gathered from a list: the people's own, or those of everybody they
 * named around them – their närstående and their nödkontakter alike.
 */
export type AddressSetKind = "contacts" | "people"

/**
 * The longest mail link worth offering. Browsers and operating systems cap the address
 * they hand to a mail client, some of them near here, and what happens past the cap is
 * theirs to decide – a mail that never opens, or one whose recipient list is cut short
 * and looks exactly like a whole one.
 */
export const mailLinkLimit = 2000

// One address and nothing else: a value holding a separator, a space, or an angle
// bracket would be read by a mail client as several recipients, or as none.
const singleAddress = /^[^\s,;<>@]+@[^\s,;<>@]+$/u

/**
 * The addresses to write to a list of people at – in the list's order, with whoever has
 * no usable address skipped, and each address once however many people share it. Two
 * spellings that differ only in case are one address, kept as it was first spelled.
 *
 * A person is both of their own addresses, primary and alternative, because the
 * registration promises the second one the same jamboree information as the first.
 * @param people The people, as the list shows them.
 * @param kind Whose addresses to gather.
 * @returns The addresses, ready to hand to a mail client.
 */
export function addressSet(
  people: readonly Participant[],
  kind: AddressSetKind,
): readonly string[] {
  const addresses = new Map<string, string>()
  for (const person of people) {
    const given =
      kind === "people"
        ? [person.email, person.alternateEmail]
        : // eslint-disable-next-line security/detect-object-injection -- a slot is one of the model's own four literals
          contactSlots.map((slot) => person.contactEmails?.[slot])
    for (const value of given) {
      const address = value?.trim() ?? ""
      const key = address.toLowerCase()
      if (singleAddress.test(address) && !addresses.has(key)) {
        addresses.set(key, address)
      }
    }
  }
  return addresses.values().toArray()
}

/**
 * The text that pastes into a recipient field as one recipient per address.
 * @param addresses The addresses, from `addressSet`.
 * @returns The addresses on one line, separated as a mail header separates them.
 */
export function clipboardText(addresses: readonly string[]): string {
  return addresses.join(", ")
}

/**
 * The link that opens a new mail with every address as a hidden copy, so no recipient
 * sees the others. Whatever its length – whether it is short enough to offer is
 * `isMailable`'s question.
 * @param addresses The addresses, from `addressSet`.
 * @returns The `mailto:` address.
 */
export function mailLink(addresses: readonly string[]): string {
  // The at sign is legal as it stands in a mailto header value, and restoring it keeps
  // two characters per address out of a link that is counted against a limit.
  const encoded = addresses.map((address) => encodeURIComponent(address).replaceAll("%40", "@"))
  return `mailto:?bcc=${encoded.join(",")}`
}

/**
 * Whether a mail link is short enough to offer. A link of exactly the limit still is.
 * @param link The link, from `mailLink`.
 * @returns True when the link can be trusted to arrive whole.
 */
export function isMailable(link: string): boolean {
  return link.length <= mailLinkLimit
}
