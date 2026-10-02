import {
  cmtAvatarNumber,
  Initials,
  istAvatarNumber,
  UnitAvatar,
} from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { unitNumberOf, type Person } from "../../../model/Person"

/**
 * The mark a person wears in front of their name – their unit's, or the IST's or the
 * contingent management's slot beyond the units.
 * @param person The person to place.
 * @returns The avatar number, or undefined for somebody no mark places.
 */
function avatarNumberOf(person: Person | undefined): number | undefined {
  const unit = unitNumberOf(person)
  if (unit !== undefined) {
    return unit
  }
  if (person?.role === "ist") {
    return istAvatarNumber
  }
  return person?.role === "kontingentledning" ? cmtAvatarNumber : undefined
}

export interface PersonMarkProps {
  /**
   * The name to take initials from when no unit mark places the person.
   */
  readonly name: string
  /**
   * Who the mark is for, undefined while the names are loading or for somebody the list
   * of participants does not hold.
   */
  readonly person: Person | undefined
}

/**
 * The mark in front of a person's name, as the rest of the product draws it – their
 * unit's badge with a leader's star, or the IST's or the management's, and their
 * initials for anybody no badge places. Decorative, because the name is beside it.
 * @param props The person, and the name to fall back on.
 * @returns The mark.
 */
export function PersonMark(props: PersonMarkProps): ReactElement {
  const avatarNumber = avatarNumberOf(props.person)

  return avatarNumber === undefined ? (
    <Initials name={props.name} />
  ) : (
    <UnitAvatar isLeader={props.person?.role === "ledare"} unitNumber={avatarNumber} />
  )
}
