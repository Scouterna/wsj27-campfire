import type { ReactElement } from "react"

import "./Initials.css"

export interface InitialsProps {
  /**
   * The whole name. The first letters of its first and last words are the initials.
   */
  readonly name: string
}

/**
 * The tile in front of a name – its initials on the theme's wash. Hidden from assistive
 * technology, because the name is right beside it.
 * @param props The name to take the initials from.
 * @returns The tile.
 */
export function Initials(props: InitialsProps): ReactElement {
  const words = props.name.trim().split(/\s+/u)
  const first = words.at(0)?.at(0) ?? ""
  const last = words.length > 1 ? (words.at(-1)?.at(0) ?? "") : ""

  return (
    <span aria-hidden="true" className="initials">
      {`${first}${last}`.toLocaleUpperCase("sv")}
    </span>
  )
}
