import type { ReactElement } from "react"

import "./PersonBadge.css"

export interface PersonBadgeProps {
  /**
   * The person's given names – the first letter of the first of them is the first
   * initial.
   */
  readonly firstName: string
  /**
   * The person's family name – its first letter is the second initial.
   */
  readonly lastName: string
  /**
   * Where the badge sits: a list row's tile at 44 points, the default, or a profile
   * header's circle at 64.
   */
  readonly size?: "profile" | "row"
}

/**
 * The first letter of a name, upper-cased the way Swedish upper-cases it.
 * @param name The name to take the initial from.
 * @returns The initial, or an empty string for a name with no letters in it.
 */
function initial(name: string): string {
  return (name.trim().at(0) ?? "").toLocaleUpperCase("sv")
}

/**
 * The fallback tile in front of a person's name – their initials on the theme's wash –
 * for the few people no unit mark places. It is hidden from assistive technology, because
 * the name is right beside it.
 *
 * Deliberately plain, because a unit's artwork and color belong to its mark, and a color
 * here would say what somebody is.
 * @param props The person's names, and where the badge sits.
 * @returns The badge.
 */
export function PersonBadge(props: PersonBadgeProps): ReactElement {
  const className = props.size === "profile" ? "person-badge person-badge-profile" : "person-badge"

  return (
    <span aria-hidden="true" className={className}>
      {initial(props.firstName)}
      {initial(props.lastName)}
    </span>
  )
}
