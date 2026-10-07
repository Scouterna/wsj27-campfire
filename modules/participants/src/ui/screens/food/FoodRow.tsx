import { BackIcon, UnitAvatar } from "@scouterna/wsj27-campfire-ui"
import { Link } from "@tanstack/react-router"
import { useId, type ReactElement } from "react"

import type { Severity } from "../../../model/HealthProfile"
import { avatarNumberFor, fullName, type Participant } from "../../../model/Participant"
import { PersonBadge } from "../../components/badge/PersonBadge"
import { severityTone } from "../../severity-tone"
import { usePrefetchParticipant } from "../participant/use-participant"

export interface FoodRowProps {
  /**
   * The free text the row expands to – the allergy description in an allergy's card, the
   * diet description in a diet's.
   */
  readonly description?: string
  /**
   * The line under the name.
   */
  readonly detail: string
  /**
   * Whether the row is expanded.
   */
  readonly isOpen: boolean
  /**
   * Expands the row, or collapses it.
   */
  readonly onToggle: () => void
  /**
   * The person the row names.
   */
  readonly person: Participant
  /**
   * The grade at the row's trailing edge, absent outside an allergen's card.
   */
  readonly severity?: Severity
}

/**
 * One person in a card of the overview, which expands in place to what they wrote and a
 * way to their page, so a reader learns how careful the kitchen has to be without leaving
 * the unit.
 * @param props The person, what the row says about them, and whether it is open.
 * @returns The row, as a list item.
 */
export function FoodRow(props: FoodRowProps): ReactElement {
  const { person, severity } = props
  const panel = useId()
  const prefetch = usePrefetchParticipant()
  const avatarNumber = avatarNumberFor(person)

  return (
    <li className="food-row">
      <button
        aria-expanded={props.isOpen}
        className="food-row-button"
        onClick={props.onToggle}
        type="button"
        {...(props.isOpen && { "aria-controls": panel })}
      >
        {avatarNumber === undefined ? (
          <PersonBadge firstName={person.firstName} lastName={person.lastName} size="row" />
        ) : (
          <UnitAvatar isLeader={person.role === "ledare"} unitNumber={avatarNumber} />
        )}
        <span className="food-row-text">
          <strong>{fullName(person)}</strong>
          <small>{props.detail}</small>
        </span>
        {severity === undefined ? null : (
          <span className={`food-grade food-grade-${severityTone(severity)}`}>{severity} av 5</span>
        )}
        <span aria-hidden="true" className="food-row-chevron">
          <BackIcon size={16} strokeWidth={2.1} />
        </span>
      </button>
      {props.isOpen && (
        <div className="food-row-panel" id={panel}>
          <p>{props.description ?? "Ingen beskrivning ifylld."}</p>
          <Link
            className="food-row-link"
            onPointerDown={() => {
              prefetch(person.memberNo)
            }}
            params={{ memberNo: person.memberNo }}
            to="/participants/$memberNo"
          >
            Visa allt om {person.firstName}
          </Link>
        </div>
      )}
    </li>
  )
}
