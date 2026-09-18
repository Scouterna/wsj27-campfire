import {
  CopyIcon,
  MailIcon,
  type OverflowMenuItem,
  type OverflowMenuReceipt,
} from "@scouterna/wsj27-campfire-ui"
import { useMemo, type ReactElement } from "react"

import {
  addressSet,
  clipboardText,
  isMailable,
  mailLink,
  type AddressSetKind,
} from "../../../model/addresses"
import type { Participant } from "../../../model/Participant"

// Constructed once: a formatter is expensive to build and free to reuse.
const swedish = new Intl.NumberFormat("sv-SE")

const nobodyReason = "Inga e-postadresser i listan."
const tooLongReason = "För många adresser för ett mejl – kopiera dem i stället."

/**
 * How one entry is drawn, whatever choosing it turns out to do.
 */
interface EntryFace {
  readonly icon?: ReactElement
  readonly label: string
}

/**
 * What the four entries are called, and the glyphs the people's two wear. The
 * närstående's entries go without, indented under them: the same two acts again, for
 * the people around the ones above.
 */
const entries: Readonly<
  Record<AddressSetKind, { readonly copy: EntryFace; readonly mail: EntryFace }>
> = {
  people: {
    copy: { icon: <CopyIcon size={20} />, label: "Kopiera e-postadresserna" },
    mail: { icon: <MailIcon size={20} />, label: "Mejla personerna i listan" },
  },
  relatives: {
    copy: { label: "Kopiera närståendes e-postadresser" },
    mail: { label: "Mejla deras närstående" },
  },
}

/**
 * Put the addresses on the clipboard, and say what came of it – the menu shows the
 * answer on the entry that was chosen. Never rejects: a refusal is an answer too.
 * @param addresses The addresses, from `addressSet`.
 * @returns How many were copied, or that they could not be.
 */
async function copy(addresses: readonly string[]): Promise<OverflowMenuReceipt> {
  try {
    // Absent outside a secure context and in an embedding that withholds it – which
    // throws here and is answered the same way as a refusal.
    await navigator.clipboard.writeText(clipboardText(addresses))
    return {
      words:
        addresses.length === 1
          ? "1 adress kopierad"
          : `${swedish.format(addresses.length)} adresser kopierade`,
    }
  } catch {
    return { isFailure: true, words: "Kunde inte kopieras" }
  }
}

/**
 * One kind's two entries: mail, then copy. Both unavailable where nobody shown has an
 * address, and mail alone where the link would be too long to trust.
 * @param found The people the list shows.
 * @param kind Whose addresses the entries act on.
 * @returns The two entries, in menu order.
 */
function entriesFor(
  found: readonly Participant[],
  kind: AddressSetKind,
): readonly OverflowMenuItem[] {
  const addresses = addressSet(found, kind)
  // eslint-disable-next-line security/detect-object-injection -- kind is one of the table's own two keys
  const { copy: copyEntry, mail: mailEntry } = entries[kind]
  if (addresses.length === 0) {
    return [
      { ...mailEntry, unavailable: nobodyReason },
      { ...copyEntry, unavailable: nobodyReason },
    ]
  }
  const href = mailLink(addresses)
  return [
    isMailable(href) ? { ...mailEntry, href } : { ...mailEntry, unavailable: tooLongReason },
    { ...copyEntry, onPerform: async () => copy(addresses) },
  ]
}

/**
 * The entries that mail and copy the addresses of the list as it is shown – searched and
 * narrowed – so narrowing the list is how somebody chooses who to write to. Everything
 * comes from the rows the list already holds; nobody is fetched to be written to.
 * @param found The people the list shows, from `narrow`.
 * @returns The four entries, or undefined while the list shows nobody. The same array for
 *   as long as the list is the same one, because the chrome republishes what it is handed.
 */
export function useAddressMenu(
  found: readonly Participant[],
): readonly OverflowMenuItem[] | undefined {
  return useMemo(
    () =>
      found.length === 0
        ? undefined
        : [...entriesFor(found, "people"), "divider", ...entriesFor(found, "relatives")],
    [found],
  )
}
