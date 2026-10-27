import { UnitAvatar, unitName } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { placingLine, type Person } from "../../../model/Person"
import { useOwnUnit } from "../../use-people"
import { PersonMark } from "../personmark/PersonMark"
import type { PersonAction } from "../personrow/PersonRow"

import "./SubjectCard.css"

/**
 * Who the card is about, their names, and what the reader may do about them.
 */
export interface SubjectCardProps {
  /**
   * The person the cases are about, undefined while the names are loading, for somebody
   * the list of participants does not hold, or for a unit as a whole.
   */
  readonly about: Person | undefined
  /**
   * What the card offers at its end, undefined for a reader who may not change it.
   */
  readonly action?: PersonAction | undefined
  /**
   * Whether a write is under way, which holds the action still.
   */
  readonly isBusy?: boolean | undefined
  /**
   * What the card is called for assistive technology. "Gäller" when left out.
   */
  readonly label?: string | undefined
  /**
   * What to call them.
   */
  readonly name: string
  /**
   * The unit the card stands for as a whole, which takes the place of a person – its badge
   * as the mark, and its name under the number.
   */
  readonly unitNumber?: number | undefined
}

/**
 * Who a case, or a list of cases, is about: their mark, their name, and where they
 * belong – or a unit as a whole – with what the reader may do about them at the card's
 * end.
 * @param props The person or the unit, what to call them, and what the card offers.
 * @returns The card.
 */
export function SubjectCard(props: SubjectCardProps): ReactElement {
  const { action, unitNumber } = props
  const ownUnit = useOwnUnit()
  const unit = unitNumber === undefined ? undefined : unitName(unitNumber)
  let placing = placingLine(props.about, unitName, ownUnit)
  // The reader's own unit is named "Hela avdelningen" already, so nothing goes under it.
  if (unitNumber !== undefined && unitNumber !== ownUnit) {
    placing = unit === undefined ? "Hela avdelningen" : `${unit} · Hela avdelningen`
  } else if (unitNumber !== undefined) {
    placing = undefined
  }

  return (
    <section aria-label={props.label ?? "Gäller"} className="card subject-card">
      {unitNumber === undefined ? (
        <PersonMark name={props.name} person={props.about} />
      ) : (
        <UnitAvatar unitNumber={unitNumber} />
      )}
      <div className="subject-card-text">
        <strong>{props.name}</strong>
        {placing !== undefined && <small>{placing}</small>}
      </div>
      {action !== undefined && (
        <button
          aria-label={`${action.spoken ?? action.label} ${props.name}`}
          className={
            action.isTaking === true
              ? "subject-card-action subject-card-remove"
              : "subject-card-action"
          }
          disabled={props.isBusy === true}
          onClick={action.onPress}
          type="button"
        >
          {action.label}
        </button>
      )}
    </section>
  )
}
