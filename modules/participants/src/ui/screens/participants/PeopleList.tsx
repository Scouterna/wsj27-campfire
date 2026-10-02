import { Row, UnitAvatar, useUnitIdentities, VirtualList } from "@scouterna/wsj27-campfire-ui"
import { memo, type ReactElement } from "react"

import {
  ageOf,
  avatarNumberFor,
  fullName,
  whereFrom,
  type Participant,
} from "../../../model/Participant"
import { roleName } from "../../../model/ParticipantRole"
import { funktionName } from "../../../model/Participation"
import { PersonBadge } from "../../components/badge/PersonBadge"
import { GenderMark } from "../../components/gender/GenderMark"

import "./PeopleList.css"

/**
 * The design's row height at the default text size, for the list to guess with before it
 * measures.
 */
const estimatedRowHeight = 72

/**
 * A row's detail line: what always shows, and where the person comes from where it is
 * shown only on a wide screen.
 */
interface RowDetail {
  /**
   * The line on every screen.
   */
  readonly always: string
  /**
   * Where the person comes from, joined on from 768px, where the line has room for it.
   */
  readonly wide?: string
}

/**
 * The line that places a person: the role first, then what places them. A deltagare or a
 * ledare is placed by their unit – with its name joined on when the identities know it –
 * the management by their funktion where the roster details one, and the IST by the one
 * word alone, since the participants service does not carry their patrols.
 * @param person The row's person.
 * @param nameOf What a unit is called, from the unit identities.
 * @returns The line.
 */
function placingLine(
  person: Participant,
  nameOf: (unitNumber: number) => string | undefined,
): string {
  const role = roleName(person.role)
  if (person.role === "kontingentledning") {
    return person.funktion === undefined ? role : `${role} · ${funktionName(person.funktion)}`
  }
  if (person.unitNumber === undefined) {
    return role
  }
  const unitName = nameOf(person.unitNumber)
  const unit = `Avdelning ${String(person.unitNumber)}`
  return unitName === undefined ? `${role} · ${unit}` : `${role} · ${unit} · ${unitName}`
}

/**
 * The line under a name. In a list whose people all share one unit, the unit says
 * nothing, so where the person comes from takes its place after the role. Anywhere else
 * the line places the person as always, and where they come from follows on a screen
 * wide enough to hold both.
 * @param person The row's person.
 * @param nameOf What a unit is called, from the unit identities.
 * @param isUnitScoped Whether every row in the list shares one unit.
 * @returns The row's detail line.
 */
function rowDetail(
  person: Participant,
  nameOf: (unitNumber: number) => string | undefined,
  isUnitScoped: boolean,
): RowDetail {
  const from = whereFrom(person)
  if (isUnitScoped) {
    const role = roleName(person.role)
    return { always: from === undefined ? role : `${role} · ${from}` }
  }
  const always = placingLine(person, nameOf)
  return from === undefined ? { always } : { always, wide: from }
}

/**
 * The person a `PersonRow` opens onto, and the list it sits in.
 */
export interface PersonRowProps {
  /**
   * Whether every row in the list shares one unit, so the unit is left out of the detail
   * line in favor of where the person comes from.
   */
  readonly isUnitScoped: boolean
  /**
   * The person the row names and links to. Compared by identity, so a row whose
   * person is unchanged skips rendering.
   */
  readonly person: Participant
}

/**
 * One row – a doorway into the person, with their gender and a deltagare's age at its
 * end. Memoized on its props, because narrowing the list re-renders it with most of its
 * rows unchanged, and a row that stays needs no work.
 */
export const PersonRow = memo(function PersonRow(props: PersonRowProps): ReactElement {
  const { isUnitScoped, person } = props
  const identities = useUnitIdentities()
  const detail = rowDetail(person, identities.name, isUnitScoped)
  const avatarNumber = avatarNumberFor(person)
  // A deltagare's age is the fact a leader reaches for, as on the home screen; a grown
  // member's says nothing the row needs.
  const age = person.role === "deltagare" ? ageOf(person, new Date()) : undefined

  return (
    <Row
      leading={
        avatarNumber === undefined ? (
          <PersonBadge firstName={person.firstName} lastName={person.lastName} size="row" />
        ) : (
          <UnitAvatar isLeader={person.role === "ledare"} unitNumber={avatarNumber} />
        )
      }
      className="person-row"
      link={{ to: "/participants/$memberNo", params: { memberNo: person.memberNo } }}
      {...((person.gender !== undefined || age !== undefined) && {
        trailing: (
          <span className="person-row-facts">
            {person.gender === undefined ? null : <GenderMark gender={person.gender} />}
            {age === undefined ? null : <span className="person-row-age">{age} år</span>}
          </span>
        ),
      })}
    >
      <strong>
        {fullName(person)}
        {person.isFunktionsansvarig === true && <span className="person-fa">FA</span>}
      </strong>
      <small>
        {detail.always}
        {detail.wide === undefined ? null : (
          <span className="person-row-wide"> · {detail.wide}</span>
        )}
      </small>
    </Row>
  )
})

export interface PeopleListProps {
  /**
   * Whether every row in the list shares one unit, so the unit is left out of the detail
   * line in favor of where the person comes from.
   */
  readonly isUnitScoped: boolean
  /**
   * Fires with the index of the topmost row in the viewport as the reader scrolls, so
   * the screen can mark where in the list they are.
   */
  readonly onFirstVisibleChange?: (index: number) => void
  /**
   * The people to list, already narrowed and in reading order. Every one of them scrolls
   * as part of one list; only those near the viewport get rows.
   */
  readonly people: readonly Participant[]
  /**
   * Receives the list's jump control once the rows are live – how a caller scrolls to a
   * row that has no DOM yet. Called again whenever the control is remade.
   */
  readonly registerJump?: (jump: (index: number) => void) => void
  /**
   * A value that changes when the narrowing does – the list scrolls back to its top when
   * it sees a new one, so a narrowed list is never entered past its end.
   */
  readonly resetKey: string
}

/**
 * The people as a virtual list, so narrowing costs the same for a unit as for the whole
 * contingent.
 * @param props The people to list, and what says the narrowing changed.
 * @returns The list.
 */
export function PeopleList(props: PeopleListProps): ReactElement {
  const { isUnitScoped } = props
  return (
    <VirtualList
      estimatedRowHeight={estimatedRowHeight}
      items={props.people}
      keyOf={(person) => person.memberNo}
      label="Deltagare"
      onFirstVisibleChange={props.onFirstVisibleChange}
      registerJump={props.registerJump}
      renderRow={(person) => <PersonRow isUnitScoped={isUnitScoped} person={person} />}
      resetKey={props.resetKey}
    />
  )
}
