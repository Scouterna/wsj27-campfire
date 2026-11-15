import { formatRowMoment } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import "./RowMoment.css"

export type RowMomentProps = {
  /**
   * The moment, as an ISO 8601 instant.
   */
  readonly at: string
  /**
   * What happened at it, read out before the moment and not shown, because on screen
   * the moment alone says it – "Uppdaterad", or "Ny".
   */
  readonly said: string
}

/**
 * When something changed, at a handbook row's end, as a case's row says when it last
 * moved – the time today, yesterday with its time, and the day and month before that.
 * @param props The moment, and what happened at it.
 * @returns The moment.
 */
export function RowMoment(props: RowMomentProps): ReactElement {
  return (
    <span className="row-moment">
      <span className="row-moment-said">{`${props.said} `}</span>
      <time dateTime={props.at}>{formatRowMoment(new Date(props.at))}</time>
    </span>
  )
}
