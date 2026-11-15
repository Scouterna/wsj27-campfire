import type { ReactElement } from "react"

import type { NewsItem } from "../../../model/news"
import { ChangeGroups } from "../../components/changegroups/ChangeGroups"
import type { FaqView } from "../../use-faq"
import type { HandbookView } from "../../use-handbook"

export type ChangesProps = {
  /**
   * The FAQ, for saying when it could not be read.
   */
  readonly faq: FaqView
  /**
   * The handbook, for saying when it could not be read.
   */
  readonly handbook: HandbookView
  /**
   * Every change in both, newest first.
   */
  readonly items: readonly NewsItem[]
  /**
   * The moment the changes' ages are counted from.
   */
  readonly now: Date
}

/**
 * Every change in the handbook and the FAQ together, a card for each stretch of time
 * that holds any, so the reader scrolls back only as far as they care to. A page and a
 * question sit side by side, told apart by their rows. A source that could not be read
 * says so rather than looking as if nothing changed in it.
 * @param props The changes, and the sources they come from.
 * @returns The cards, or a line saying there are none.
 */
export function Changes(props: ChangesProps): ReactElement {
  const { faq, handbook } = props
  const missing = [
    ...(handbook.chapters.length === 0 && handbook.error !== null ? ["Handboken"] : []),
    ...(faq.folders.length === 0 && faq.error !== null ? ["Frågorna"] : []),
  ]
  const unread =
    missing.length === 0 ? null : (
      <p className="handbook-status">{missing.join(" och ")} kunde inte hämtas.</p>
    )

  if (props.items.length === 0) {
    return (
      <>
        <p className="handbook-status" role="status">
          {handbook.isPending || faq.isPending ? "Hämtar ändringarna …" : "Inget har ändrats ännu."}
        </p>
        {unread}
      </>
    )
  }

  return (
    <>
      <ChangeGroups items={props.items} now={props.now} />
      {unread}
    </>
  )
}
