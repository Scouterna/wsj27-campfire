import type { ReactElement } from "react"

import { freshnessOf } from "../../../model/Handbook"
import { changedOn } from "../../changed-on"

import "./ChangeBadge.css"

export type ChangeBadgeProps = {
  /**
   * When the change happened, as an ISO 8601 instant.
   */
  readonly at: string
  /**
   * The id of the note the badge opens, when it opens one. Without it the badge only
   * states the date.
   */
  readonly controls?: string
  /**
   * Whether the note it opens is open.
   */
  readonly isOpen?: boolean
  /**
   * What happened, before the date – "Uppdaterad", or "Ny" for a question.
   */
  readonly label: string
  /**
   * The moment the badge's age is judged against.
   */
  readonly now: Date
  /**
   * What pressing the badge does – opening or closing its note.
   */
  readonly onToggle?: () => void
}

/**
 * When something changed, beside its title, in a tint that fades week by week over the
 * month a change is news, and on no tint at all once it is older. With a note to open,
 * the badge is the button that opens it.
 * @param props The change's moment, and the note it opens, if any.
 * @returns The badge.
 */
export function ChangeBadge(props: ChangeBadgeProps): ReactElement {
  const className = `handbook-change-badge is-${freshnessOf(props.at, props.now)}`
  const text = `${props.label} ${changedOn(props.at, props.now)}`
  if (props.controls === undefined || props.onToggle === undefined) {
    return <span className={className}>{text}</span>
  }
  return (
    <button
      aria-controls={props.controls}
      aria-expanded={props.isOpen === true}
      className={className}
      onClick={props.onToggle}
      type="button"
    >
      {text}
    </button>
  )
}
