import type { ReactElement } from "react"

import { useUnitIdentities } from "../../foundations/units/UnitIdentities"

import "./UnitAvatar.css"

/**
 * The IST's slot among the unit identities: beyond the units, with a mark and a name
 * of its own.
 */
export const istAvatarNumber = 54

/**
 * The contingent management's slot among the unit identities.
 */
export const cmtAvatarNumber = 55

export interface UnitAvatarProps {
  /**
   * The avatar's number: a unit's own, 54 for the IST, 55 for the
   * contingent management.
   */
  readonly unitNumber: number
  /**
   * Marks a unit leader: a star sits in a notch cut out of the mark's corner, in the
   * unit's own ink.
   */
  readonly isLeader?: boolean
  /**
   * Where the avatar sits: a list row (44 points, the default) or a profile header
   * (64).
   */
  readonly size?: "profile" | "row"
}

/**
 * A unit's mark: the ring in the theme's bright color, the disc in its ink, and the
 * unit's white glyph – the badge the whole identity system draws from. Every mark
 * wears the surrounding theme rather than its unit's own, so a mixed list – the whole
 * contingent under the management's red – reads as one list, and the glyph alone says
 * which unit it is. While the identities are unloaded, the disc carries the unit's
 * number instead, in the same dress.
 *
 * Decorative on purpose: every surface that draws the avatar says the unit or the
 * person in text beside it, so the mark is hidden from assistive technology.
 *
 * @param props The number whose mark to draw, and the size.
 * @returns The mark.
 */
export function UnitAvatar(props: UnitAvatarProps): ReactElement {
  const identities = useUnitIdentities()
  const glyph = identities.glyphSrc(props.unitNumber)
  const size = props.size ?? "row"

  const mark = (
    <span aria-hidden="true" className={`unit-avatar unit-avatar-${size}`}>
      <span className="unit-avatar-disc">
        {glyph === undefined ? (
          <span className="unit-avatar-number">{props.unitNumber}</span>
        ) : (
          <img alt="" className="unit-avatar-glyph" src={glyph} />
        )}
      </span>
    </span>
  )

  if (props.isLeader !== true) {
    return mark
  }

  // The star sits in a notch masked out of the mark's corner, so the badge reads as
  // one cut piece rather than a sticker. Its ink is the theme's own, like the mark's.
  return (
    <span aria-hidden="true" className={`unit-avatar-leader unit-avatar-leader-${size}`}>
      {mark}
      <svg aria-hidden="true" className="unit-avatar-star" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.5 14.9 8.4l6.5 1-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-1z" />
      </svg>
    </span>
  )
}
