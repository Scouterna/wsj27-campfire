import { OverflowMenu, type OverflowMenuItem } from "@scouterna/wsj27-campfire-ui"
import type { PointerEvent, ReactElement } from "react"

import type { Care } from "../../../model/Care"
import { ageOf, fullName, type Participant } from "../../../model/Participant"
import type { ParticipantDetail } from "../../../model/ParticipantDetail"
import { GenderMark } from "../../components/gender/GenderMark"
import { PatrolCare } from "./PatrolCare"

/**
 * The person a `PatrolMember` carries, and what can be done with them.
 */
export interface PatrolMemberProps {
  /**
   * What the person needs, and their record in full to show it from. Absent for anybody
   * who declared nothing, and while the unit's records are on their way.
   */
  readonly care?: { readonly care: Care; readonly person: ParticipantDetail }
  /**
   * Whether this person is among the people being carried, so the chip left behind can
   * fade.
   */
  readonly isCarried: boolean
  /**
   * Whether the person has just been put down here, so the chip can settle into place.
   */
  readonly isLanded: boolean
  /**
   * Whether the person is picked for moving together with others.
   */
  readonly isSelected: boolean
  /**
   * Where the person can be moved from the chip's menu – every patrol they are not in,
   * and out of the one they are.
   */
  readonly moves: readonly OverflowMenuItem[]
  /**
   * What picks the chip up for a drag.
   */
  readonly onPointerDown: (event: PointerEvent<HTMLElement>) => void
  /**
   * Picks the person, or lets them go again.
   */
  readonly onToggle: () => void
  /**
   * Who the chip is.
   */
  readonly person: Participant
}

/**
 * What a chip says under the name: a leader's role, or a scout's age where it is known.
 * @param person The chip's person.
 * @returns The word or two.
 */
function detailOf(person: Participant): string {
  if (person.role === "ledare") {
    return "Ledare"
  }
  const age = ageOf(person, new Date())
  return age === undefined ? "Deltagare" : `${String(age)} år`
}

/**
 * One person in a patrol as a chip: pressed, it picks them to move with others, and held
 * and carried, it moves them – with everybody picked alongside them, when they are
 * picked. Their care needs sit beside the name, and a menu moves them without any
 * dragging, for a screen reader and for anybody who cannot drag.
 * @param props The person, whether they are picked, and where they can go.
 * @returns The chip.
 */
export function PatrolMember(props: PatrolMemberProps): ReactElement {
  const { care, isCarried, isLanded, isSelected, moves, onPointerDown, onToggle, person } = props
  const classes = ["patrol-member"]
  if (isSelected) {
    classes.push("patrol-member-selected")
  }
  if (isCarried) {
    classes.push("patrol-member-carried")
  }
  if (isLanded) {
    classes.push("patrol-member-landed")
  }

  return (
    <li className={classes.join(" ")} onPointerDown={onPointerDown}>
      <button
        aria-label={`Välj ${fullName(person)}`}
        aria-pressed={isSelected}
        className="patrol-member-body"
        onClick={onToggle}
        type="button"
      >
        <span className="patrol-member-text">
          <span className="patrol-member-name">
            {person.gender === undefined ? null : <GenderMark gender={person.gender} />}
            {fullName(person)}
          </span>
          <small>
            {detailOf(person)}
            {person.memberGroup === undefined ? null : ` · ${person.memberGroup}`}
          </small>
        </span>
      </button>
      {care === undefined ? null : <PatrolCare care={care.care} person={care.person} />}
      <span data-no-drag="">
        <OverflowMenu items={moves} label={`Flytta ${fullName(person)}`} />
      </span>
    </li>
  )
}
