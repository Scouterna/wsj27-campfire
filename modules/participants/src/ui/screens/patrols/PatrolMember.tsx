import { OverflowMenu, type OverflowMenuItem } from "@scouterna/wsj27-campfire-ui"
import type { PointerEvent, ReactElement } from "react"

import type { Care } from "../../../model/Care"
import { genderName } from "../../../model/Gender"
import { ageOf, fullName, type Participant } from "../../../model/Participant"
import { CareButton } from "../../components/carebutton/CareButton"
import { GenderMark } from "../../components/gender/GenderMark"
import { chipId } from "./use-patrol-moves"

import "./PatrolMember.css"

/**
 * The person a `PatrolMember` carries, and what can be done with them.
 */
export interface PatrolMemberProps {
  /**
   * What the person needs. Absent for anybody who declared nothing, and while the unit's
   * records are on their way.
   */
  readonly care?: Care
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
   * Opens the person's care.
   */
  readonly onOpenCare: () => void
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
 * What a chip says under the name: the scout's age, where it is known, and their kår.
 * @param person The chip's person.
 * @returns The line's parts, in order.
 */
function detailOf(person: Participant): readonly string[] {
  const age = ageOf(person, new Date())
  const detail = age === undefined ? "Deltagare" : `${String(age)} år`
  return person.memberGroup === undefined ? [detail] : [detail, person.memberGroup]
}

/**
 * What a chip is called to a screen reader: all it shows, because the mark, the age, and
 * the kår are what a patrol is balanced by, and the name alone would hide them.
 * @param person The chip's person.
 * @returns The name.
 */
function nameOf(person: Participant): string {
  const { gender } = person
  const mark = gender === undefined || gender === "okant" ? [] : [genderName(gender).toLowerCase()]
  // Joined with commas rather than the line's dot, which a screen reader may say aloud.
  return [`Välj ${fullName(person)}`, ...mark, ...detailOf(person)].join(", ")
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
  const {
    care,
    isCarried,
    isLanded,
    isSelected,
    moves,
    onOpenCare,
    onPointerDown,
    onToggle,
    person,
  } = props
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
        aria-label={nameOf(person)}
        aria-pressed={isSelected}
        className="patrol-member-body"
        id={chipId(person.memberNo)}
        onClick={onToggle}
        type="button"
      >
        <span className="patrol-member-text">
          <span className="patrol-member-name">
            {person.gender === undefined ? null : <GenderMark gender={person.gender} />}
            <span className="patrol-member-full-name">{fullName(person)}</span>
          </span>
          <small>{detailOf(person).join(" · ")}</small>
        </span>
      </button>
      {care === undefined ? null : (
        <span data-no-drag="">
          <CareButton care={care} name={fullName(person)} onPress={onOpenCare} />
        </span>
      )}
      <span data-no-drag="">
        <OverflowMenu isFlush items={moves} label={`Flytta ${fullName(person)}`} />
      </span>
    </li>
  )
}
