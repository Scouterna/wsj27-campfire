import { unitName } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { nameOf, placingLine, type People } from "../../../model/Person"
import { PersonMark } from "../../components/personmark/PersonMark"

/**
 * What a person's row offers at its end – sharing the case with them, taking it back,
 * making them responsible for it.
 */
export interface PersonAction {
  /**
   * Whether the action takes something from the person, which the danger ink says.
   */
  readonly isTaking?: boolean
  /**
   * The word or two at the row's end – "Dela", "Ta bort", "Tilldela".
   */
  readonly label: string
  /**
   * What pressing it does.
   */
  readonly onPress: () => void
  /**
   * The words spoken before the person's name, where they differ from the label – "Dela
   * med" for "Dela".
   */
  readonly spoken?: string
}

export interface PersonRowProps {
  /**
   * What the row offers, undefined for a reader who may not change anything about them.
   */
  readonly action: PersonAction | undefined
  /**
   * Whether a write is under way, which holds the button still.
   */
  readonly isBusy: boolean
  /**
   * The person, by member number.
   */
  readonly memberNo: string
  /**
   * Everyone the module knows, undefined while the names are loading.
   */
  readonly people: People | undefined
  /**
   * The reader's own member number, so their own row says it is theirs.
   */
  readonly readerMemberNo?: string | undefined
}

/**
 * One person the case names: their mark, name, and where they belong, and at the row's
 * end what the reader may do about them. The action is named with the person, so a list
 * of the same word reads apart.
 * @param props The person, and what the row offers.
 * @returns The row.
 */
export function PersonRow(props: PersonRowProps): ReactElement {
  const person = props.people?.get(props.memberNo)
  const name = nameOf(props.people, props.memberNo)
  const placing = placingLine(person, unitName)
  const { action } = props

  return (
    <li className="access-card-person">
      <PersonMark name={name} person={person} />
      <span className="access-card-name">
        <strong>{props.memberNo === props.readerMemberNo ? `${name} (du)` : name}</strong>
        {placing !== undefined && <small>{placing}</small>}
      </span>
      {action !== undefined && (
        <button
          aria-label={`${action.spoken ?? action.label} ${name}`}
          className={
            action.isTaking === true
              ? "access-card-action access-card-remove"
              : "access-card-action"
          }
          disabled={props.isBusy}
          onClick={action.onPress}
          type="button"
        >
          {action.label}
        </button>
      )}
    </li>
  )
}
