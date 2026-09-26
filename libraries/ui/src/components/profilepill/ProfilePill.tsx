import { Link } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"

import type { LinkTarget } from "../../routing/routes"

import "./ProfilePill.css"

export interface ProfilePillProps {
  /**
   * The mark drawn in place of the initials – the signed-in person's unit avatar,
   * once the application may show it. The initials stand in when nothing is given.
   */
  readonly avatar?: ReactNode
  /**
   * Who is signed in. The first letters of the first two names are the avatar's
   * stand-in.
   */
  readonly name: string
  /**
   * The line under the name – the role, the unit. Not rendered in the compact form.
   */
  readonly detail: string
  /**
   * Whether the page the control leads to is the one already showing. The control
   * then says so to assistive technology and a press does nothing, the way a section
   * link answers when its section's start is what is shown.
   */
  readonly isCurrent?: boolean
  /**
   * The control's accessible name – where it leads, wrapped around the visible name,
   * e.g. "Profil för Anna Andersson", so assistive technology hears the destination
   * and the visible label stays inside it.
   */
  readonly label: string
  /**
   * Where the control leads – the person's own page. Rendered as a real link, so the
   * router – and the reader's middle click – treat it as the navigation it is.
   */
  readonly link: LinkTarget
  /**
   * Whether the avatar is drawn alone, for the bar's corner at phone width.
   */
  readonly compact?: boolean
}

/**
 * Who is signed in, as the doorway to their own page: the given mark – or the initials
 * in a filled circle – and, unless compact, a white pill with the name and the detail
 * line. The visible label is the person, not the destination; the accessible name
 * carries both.
 *
 * Chrome, like the section menus beside it, so the page it opens cross-fades in as a
 * start of its own rather than sliding in as a detail of wherever it was pressed.
 *
 * @param props The person, the accessible name, and where the control leads.
 * @returns The control.
 */
export function ProfilePill(props: ProfilePillProps): ReactElement {
  return (
    <Link
      aria-current={props.isCurrent ? "page" : undefined}
      aria-label={props.label}
      className={props.compact ? "profile-compact" : "profile"}
      data-nav="fade"
      to={props.link.to}
      params={props.link.params ?? {}}
      onClick={(event) => {
        if (props.isCurrent) {
          event.preventDefault()
        }
      }}
    >
      {props.avatar ?? (
        <span className="profile-avatar" aria-hidden="true">
          {initialsOf(props.name)}
        </span>
      )}
      {props.compact ? null : (
        <span className="profile-person">
          <strong>{props.name}</strong>
          <small>{props.detail}</small>
        </span>
      )}
    </Link>
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
