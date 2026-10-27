import type { ReactElement } from "react"

import type { Case } from "../../../model/Case"
import type { People } from "../../../model/Person"
import { CaseRow } from "../caserow/CaseRow"

import "./CaseRows.css"

/**
 * The cases, their names, and the list's name.
 */
export interface CaseRowsProps {
  /**
   * The cases, in the order they are listed.
   */
  readonly cases: readonly Case[]
  /**
   * What the list is called for assistive technology.
   */
  readonly label: string
  /**
   * Everyone the cases can be about, undefined while the names are loading.
   */
  readonly people: People | undefined
}

/**
 * A short list of cases to act on, each row dated by when something last happened on it –
 * for a card that holds a handful, where a virtualized list would be machinery for nothing.
 * @param props The cases, their names, and the list's name.
 * @returns The list.
 */
export function CaseRows(props: CaseRowsProps): ReactElement {
  return (
    <ul aria-label={props.label} className="case-rows">
      {props.cases.map((item) => (
        <li key={item.id}>
          <CaseRow isAboutShown={true} item={item} people={props.people} />
        </li>
      ))}
    </ul>
  )
}
