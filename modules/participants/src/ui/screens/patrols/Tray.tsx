import { Card } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement, ReactNode } from "react"

import { counted } from "../../counted"

import "./PatrolMember.css"
import "./Tray.css"

/**
 * What the tray of people in no patrol holds, and whether a person is carried over it.
 */
export interface TrayProps {
  /**
   * The chips of the people in no patrol.
   */
  readonly children: ReactNode
  /**
   * How many people it holds.
   */
  readonly count: number
  /**
   * Whether a carried person is over the tray, so it can say it will take them.
   */
  readonly isOver: boolean
}

/**
 * The people in no patrol – where a unit nobody has divided starts, and where a person
 * taken out of a patrol lands.
 * @param props The chips, their count, and whether a drag is over it.
 * @returns The card.
 */
export function Tray(props: TrayProps): ReactElement {
  return (
    <Card aside={<span aria-hidden="true">{counted(props.count)}</span>} title="Utan patrull">
      <div
        className={props.isOver ? "patrols-tray patrols-tray-over" : "patrols-tray"}
        data-patrol-drop="none"
      >
        <ul aria-label="Utan patrull" className="patrol-members">
          {props.children}
        </ul>
        <p className="patrol-members-empty">
          Alla har en patrull. Dra hit någon för att ta ur patrullen.
        </p>
      </div>
    </Card>
  )
}
