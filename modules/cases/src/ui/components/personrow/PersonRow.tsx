import { UnitAvatar, unitName } from "@scouterna/wsj27-campfire-ui"
import { useCallback, useState, type ReactElement, type ReactNode } from "react"

import { nameOf, placingLine, type People } from "../../../model/Person"
import { useOwnUnit } from "../../use-people"
import { PersonMark } from "../personmark/PersonMark"

import "./PersonRow.css"

/**
 * What a person's row offers at its end – sharing the case with them, taking it back,
 * making them responsible for it.
 */
export interface PersonAction {
  /**
   * Whether the button takes focus as the row mounts – for a row that takes the place of
   * what the reader was just using, so focus follows rather than falling to the page.
   */
  readonly isFocusedOnMount?: boolean
  /**
   * Whether the action takes something from the person, which the danger ink says.
   */
  readonly isTaking?: boolean
  /**
   * The word or two at the row's end – "Dela", "Ta bort", "Välj".
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

/**
 * What every row carries, whoever it is about.
 */
interface RowProps {
  /**
   * What the row offers, undefined for a reader who may not change anything about them.
   */
  readonly action: PersonAction | undefined
  /**
   * Whether a write is under way, which holds the button still.
   */
  readonly isBusy: boolean
  /**
   * Something more the row offers, before its action – a control of its own, such as the
   * way to add someone beside the last person chosen.
   */
  readonly trailing?: ReactNode | undefined
}

/**
 * A row about one person, named from the people the module knows.
 */
export interface PersonRowPersonProps extends RowProps {
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
 * A row about a unit as a whole.
 */
export interface PersonRowUnitProps extends RowProps {
  /**
   * The unit, by number.
   */
  readonly unitNumber: number
}

/**
 * Who the row is about – a person, or a unit as a whole – and what the reader may do
 * about them.
 */
export type PersonRowProps = PersonRowPersonProps | PersonRowUnitProps

/**
 * One person the case names, or a unit it is about as a whole: their mark, name, and
 * where they belong, and at the row's end what the reader may do about them. The action
 * is named with the person, so a list of the same word reads apart. A unit wears the
 * person's shape, so it lines up with the people around it.
 * @param props Who the row is about, and what it offers.
 * @returns The row.
 */
export function PersonRow(props: PersonRowProps): ReactElement {
  const { action } = props
  // Read once, as the row mounts, so a later change never moves focus again.
  const [isFocusedOnMount] = useState(action?.isFocusedOnMount === true)
  const focusOnMount = useCallback(
    (node: HTMLButtonElement | null) => {
      if (isFocusedOnMount) {
        node?.focus()
      }
    },
    [isFocusedOnMount],
  )
  const ownUnit = useOwnUnit()
  const subject =
    "unitNumber" in props ? unitSubject(props.unitNumber, ownUnit) : personSubject(props, ownUnit)

  return (
    <li className="case-person-row">
      {subject.mark}
      <span className="case-person-row-name">
        <strong>{subject.title}</strong>
        {subject.placing !== undefined && <small>{subject.placing}</small>}
      </span>
      {props.trailing}
      {action !== undefined && (
        <button
          aria-label={`${action.spoken ?? action.label} ${subject.name}`}
          className={
            action.isTaking === true
              ? "case-person-row-action case-person-row-remove"
              : "case-person-row-action"
          }
          disabled={props.isBusy}
          onClick={action.onPress}
          ref={focusOnMount}
          type="button"
        >
          {action.label}
        </button>
      )}
    </li>
  )
}

/**
 * What a row draws for whoever it is about.
 */
interface Subject {
  /**
   * The mark in front of the name.
   */
  readonly mark: ReactElement
  /**
   * The name the action is spoken with.
   */
  readonly name: string
  /**
   * The line under the name, undefined where nothing is known to put there.
   */
  readonly placing: string | undefined
  /**
   * The name as shown, which for the reader says it is theirs.
   */
  readonly title: string
}

/**
 * A person, named from the people the module knows.
 * @param props The person, and the names.
 * @param ownUnit The one unit the reader leads, which the line under the name leaves out.
 * @returns What to draw.
 */
function personSubject(props: PersonRowPersonProps, ownUnit: number | undefined): Subject {
  const person = props.people?.get(props.memberNo)
  const name = nameOf(props.people, props.memberNo)
  return {
    mark: <PersonMark name={name} person={person} />,
    name,
    placing: placingLine(person, unitName, ownUnit),
    title: props.memberNo === props.readerMemberNo ? `${name} (du)` : name,
  }
}

/**
 * A unit as a whole, by its number and name – or, for the one unit the reader leads, as the
 * whole unit.
 * @param unitNumber The unit.
 * @param ownUnit The one unit the reader leads, undefined for everyone else.
 * @returns What to draw.
 */
function unitSubject(unitNumber: number, ownUnit: number | undefined): Subject {
  if (unitNumber === ownUnit) {
    const whole = "Hela avdelningen"
    return {
      mark: <UnitAvatar unitNumber={unitNumber} />,
      name: whole,
      placing: undefined,
      title: whole,
    }
  }
  const name = unitName(unitNumber)
  const title = `Avdelning ${String(unitNumber)}`
  return {
    mark: <UnitAvatar unitNumber={unitNumber} />,
    name: title,
    placing: name === undefined ? "Hela avdelningen" : `${name} · Hela avdelningen`,
    title,
  }
}
