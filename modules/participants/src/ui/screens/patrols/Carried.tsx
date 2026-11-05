import type { ReactElement } from "react"

import { fullName, type Participant } from "../../../model/Participant"
import type { Drag } from "./use-patrol-drag"

import "./Carried.css"

/**
 * The drag a `Carried` copy follows, and whose chip it copies.
 */
export interface CarriedProps {
  /**
   * How many are carried along with the person whose chip was picked up.
   */
  readonly alongside: number
  /**
   * The drag in progress.
   */
  readonly drag: Drag
  /**
   * The person whose chip was picked up.
   */
  readonly person: Participant
}

/**
 * The copy of a chip that follows the pointer, saying how many more come along.
 * @param props The drag, who is carried, and how many with them.
 * @returns The copy.
 */
export function Carried(props: CarriedProps): ReactElement {
  const { alongside, drag, person } = props
  return (
    <div
      aria-hidden="true"
      className="patrols-carried"
      // Where the pointer is, which changes every frame.
      style={{
        transform: `translate(${String(drag.x)}px, ${String(drag.y)}px)`,
        width: `${String(drag.width)}px`,
      }}
    >
      {fullName(person)}
      {alongside > 0 && <span className="patrols-carried-more">+{alongside}</span>}
    </div>
  )
}
