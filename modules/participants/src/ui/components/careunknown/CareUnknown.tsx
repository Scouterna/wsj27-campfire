import type { ReactElement } from "react"

import "./CareUnknown.css"

/**
 * Whether a `CareUnknown` has anything to say.
 */
export interface CareUnknownProps {
  /**
   * Whether the care of the people under it could not be read.
   */
  readonly isShown: boolean
}

/**
 * The quiet line over a list whose care could not be read, because rows without a mark
 * would otherwise read as nobody needing anything. An alert, because an alert is announced
 * as it appears, where a status line mounted with its words is not – and present only
 * while there is something to say, so the page's own status line stays its only one.
 * @param props Whether to say it.
 * @returns The line, or nothing while the care is known.
 */
export function CareUnknown(props: CareUnknownProps): ReactElement | null {
  return props.isShown ? (
    <p className="care-unknown" role="alert">
      Hälsouppgifterna kunde inte hämtas, så ingens behov visas.
    </p>
  ) : null
}
