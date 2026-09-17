import type { ReactElement } from "react"

import "./ProfilePill.css"

export interface ProfilePillProps {
  /**
   * Who is signed in. The first letters of the first two names are the avatar.
   */
  readonly name: string
  /**
   * The line under the name – the role, the unit. Not rendered in the compact form.
   */
  readonly detail: string
  /**
   * The control's accessible name – what pressing it does, wrapped around the visible
   * name, e.g. "Logga ut Anna Andersson", so assistive technology hears the action and
   * the visible label stays inside it.
   */
  readonly label: string
  /**
   * What pressing the control does.
   */
  readonly onPress: () => void
  /**
   * Compact renders the avatar initials alone – the bar's corner at phone width.
   */
  readonly compact?: boolean
}

/**
 * Who is signed in, as a pressable control: the initials in a filled circle, and –
 * unless compact – a white pill with the name and the detail line. The visible label
 * is the person, not the action; the accessible name carries both.
 *
 * @param props The person, the accessible name, and what pressing does.
 * @returns The control.
 */
export function ProfilePill(props: ProfilePillProps): ReactElement {
  return (
    <button
      type="button"
      className={props.compact ? "profile-compact" : "profile"}
      aria-label={props.label}
      onClick={props.onPress}
    >
      <span className="profile-avatar" aria-hidden="true">
        {initialsOf(props.name)}
      </span>
      {props.compact ? null : (
        <span className="profile-person">
          <strong>{props.name}</strong>
          <small>{props.detail}</small>
        </span>
      )}
    </button>
  )
}

/**
 * The avatar's letters: the first letter of each of the first two names, so "Anna
 * Andersson" reads AA and a single name reads as its one letter.
 * @param name The visible name.
 * @returns At most two initials, uppercased.
 */
function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter((word) => word !== "")
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
}
