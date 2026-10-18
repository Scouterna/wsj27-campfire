import { cmtAvatarNumber, Initials, UnitAvatar } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import type { ImpersonationTarget } from "../../../model/ImpersonationTarget"
import { markFor } from "../../../model/User"

export interface TargetMarkProps {
  /**
   * Whether the units reveal is open. A leader's badge names their unit, so until then a
   * leader wears their initials.
   */
  readonly isUnitShown: boolean
  /**
   * Which size to draw – a list row's, or the profile page's larger one.
   */
  readonly size?: "profile" | "row"
  /**
   * Who the mark is for.
   */
  readonly target: ImpersonationTarget
}

/**
 * The mark in front of somebody to be shown Campfire as, the one they wear signed in
 * themselves – their unit's badge with a leader's star, or the management's – and their
 * initials where no badge may be shown. Decorative, because the name is beside it.
 * @param props The person, and whether their unit may be shown.
 * @returns The mark.
 */
export function TargetMark(props: TargetMarkProps): ReactElement {
  const { isUnitShown, size = "row", target } = props
  const mark = markFor(target.roles, target.unit)

  // The management's badge names no unit, so it is shown before the reveal as well.
  if (mark === undefined || (mark.unitNumber !== undefined && !isUnitShown)) {
    return <Initials name={target.name} />
  }
  return (
    <UnitAvatar
      isLeader={mark.isLeader}
      size={size}
      unitNumber={mark.unitNumber ?? cmtAvatarNumber}
    />
  )
}
