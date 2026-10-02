import { useUnitIdentities } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { placingLine, type Person } from "../../../model/Person"
import { PersonMark } from "../personmark/PersonMark"

import "./SubjectCard.css"

export interface SubjectCardProps {
  /**
   * The person the cases are about, undefined while the names are loading or for
   * somebody the list of participants does not hold.
   */
  readonly about: Person | undefined
  /**
   * What to call them.
   */
  readonly name: string
}

/**
 * Who a case, or a list of cases, is about: their mark, their name, and where they
 * belong.
 * @param props The person, and what to call them.
 * @returns The card.
 */
export function SubjectCard(props: SubjectCardProps): ReactElement {
  const identities = useUnitIdentities()
  const placing = placingLine(props.about, identities.name)

  return (
    <section aria-label="Gäller" className="card subject-card">
      <PersonMark name={props.name} person={props.about} />
      <div className="subject-card-text">
        <strong>{props.name}</strong>
        {placing !== undefined && <small>{placing}</small>}
      </div>
    </section>
  )
}
