import type { ReactElement, ReactNode } from "react"

import { lastActivity, type Case } from "../../../model/Case"
import type { People } from "../../../model/Person"
import { CaseRow } from "../caserow/CaseRow"

import "./CaseRows.css"

export interface CaseRowsProps {
  /**
   * The control at a case's row's end, undefined for a row without one.
   */
  readonly actionFor?: (item: Case) => ReactNode
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
          <CaseRow
            action={props.actionFor?.(item)}
            isAboutShown={true}
            item={item}
            moment={lastActivity(item)}
            people={props.people}
          />
        </li>
      ))}
    </ul>
  )
}
