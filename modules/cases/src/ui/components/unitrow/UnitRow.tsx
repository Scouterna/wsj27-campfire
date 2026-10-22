import { UnitAvatar, unitName } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import type { PersonAction } from "../personrow/PersonRow"

// It wears the person row's shape, so a unit lines up with the people around it.
import "../personrow/PersonRow.css"

export interface UnitRowProps {
  /**
   * What the row offers, undefined for a reader who may not change it.
   */
  readonly action?: PersonAction | undefined
  /**
   * The unit.
   */
  readonly unitNumber: number
}

/**
 * A unit a case is about as a whole, in a list of who a case is about: its mark, its number
 * and name, and at the row's end what the reader may do about it.
 * @param props The unit, and what the row offers.
 * @returns The row.
 */
export function UnitRow(props: UnitRowProps): ReactElement {
  const { action, unitNumber } = props
  const name = unitName(unitNumber)
  const title = `Avdelning ${String(unitNumber)}`

  return (
    <li className="case-person-row">
      <UnitAvatar unitNumber={unitNumber} />
      <span className="case-person-row-name">
        <strong>{title}</strong>
        <small>{name === undefined ? "Hela avdelningen" : `${name} · Hela avdelningen`}</small>
      </span>
      {action !== undefined && (
        <button
          aria-label={`${action.spoken ?? action.label} ${title}`}
          className={
            action.isTaking === true
              ? "case-person-row-action case-person-row-remove"
              : "case-person-row-action"
          }
          onClick={action.onPress}
          type="button"
        >
          {action.label}
        </button>
      )}
    </li>
  )
}
