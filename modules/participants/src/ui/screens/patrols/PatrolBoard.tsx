import { DotMeter, PencilIcon } from "@scouterna/wsj27-campfire-ui"
import { useId, type ReactElement, type ReactNode } from "react"

import { genderCount, type Gender } from "../../../model/Gender"
import { patrolSize, type PatrolStats } from "../../../model/Patrol"
import { GenderMark } from "../../components/gender/GenderMark"

import "./PatrolBoard.css"
import "./PatrolMember.css"

// The order the genders are drawn in along the bar.
const genderOrder: readonly Gender[] = ["kvinna", "man", "annat", "okant"]

/**
 * The patrol a `PatrolBoard` is, and what it holds.
 */
export interface PatrolBoardProps {
  /**
   * The chips of the people in the patrol.
   */
  readonly children: ReactNode
  /**
   * The patrol's place – what a person dropped on it lands in.
   */
  readonly index: number
  /**
   * Whether a carried person is over the board, so it can say it will take them.
   */
  readonly isOver: boolean
  /**
   * What the patrol is called – its name, or the placeholder while it has none.
   */
  readonly label: string
  /**
   * The patrol's name as typed, empty while it has none.
   */
  readonly name: string
  /**
   * Called with the name as the leader types it.
   */
  readonly onRename: (name: string) => void
  /**
   * The name the patrol goes by while it has none of its own.
   */
  readonly placeholder: string
  /**
   * The figures the patrol is weighed by.
   */
  readonly stats: PatrolStats
}

/**
 * The counts a `GenderBar` draws.
 */
interface GenderBarProps {
  /**
   * The patrol's scouts, counted by gender.
   */
  readonly genders: PatrolStats["genders"]
}

/**
 * The patrol's scouts by gender, as one bar split in proportion, each part carrying its
 * mark and its count. Read aloud as the counts, since the bar only draws them.
 * @param props The counts.
 * @returns The bar, or nothing for a patrol without scouts.
 */
function GenderBar(props: GenderBarProps): ReactElement | null {
  const count = (gender: Gender): number => props.genders.get(gender) ?? 0
  const present = genderOrder.filter((gender) => count(gender) > 0)
  if (present.length === 0) {
    return null
  }
  const spoken = present.map((gender) => genderCount(gender, count(gender))).join(", ")
  return (
    <div aria-label={spoken} className="patrol-genders" role="img">
      {present.map((gender) => (
        <span
          aria-hidden="true"
          className={`patrol-genders-part patrol-genders-${gender}`}
          key={gender}
          // The share is data, so it is the one style the stylesheet cannot hold.
          style={{ flexGrow: count(gender) }}
        >
          {gender === "okant" ? "?" : <GenderMark gender={gender} />}
          {count(gender)}
        </span>
      ))}
    </div>
  )
}

/**
 * One patrol as a board a person can be dropped on: its name, as a field the leader
 * types into, how full it is against what a patrol holds, how it mixes, and its scouts.
 * The whole board is the drop target, so a person can be let go anywhere on it.
 * @param props The patrol, its figures, and its people.
 * @returns The board.
 */
export function PatrolBoard(props: PatrolBoardProps): ReactElement {
  const { index, isOver, label, name, onRename, placeholder, stats } = props
  const isOverfull = stats.scouts > patrolSize
  const nameNote = useId()
  // The service keeps a patrol only as a name on its people, so nothing can hold this one.
  const isNameUnheld = name.trim() !== "" && stats.scouts === 0
  return (
    <section
      aria-label={label}
      className={isOver ? "patrol-board patrol-board-over" : "patrol-board"}
      data-patrol-drop={index}
    >
      <div className="patrol-board-heading">
        {/* A field that looks like one, with a pencil, because a title alone never says it
            can be typed into. The label is the field's whole area, so a press on the pencil
            lands in it too. */}
        <label className="patrol-board-name-field">
          <input
            aria-describedby={isNameUnheld ? nameNote : undefined}
            aria-label={`Namn på ${placeholder.toLowerCase()}`}
            className="patrol-board-name"
            enterKeyHint="done"
            maxLength={40}
            onChange={(event) => {
              onRename(event.target.value)
            }}
            onKeyDown={(event) => {
              // No form to submit, so the keyboard's Done key has to put itself away.
              if (event.key === "Enter") {
                event.currentTarget.blur()
              }
            }}
            placeholder={placeholder}
            value={name}
          />
          <span aria-hidden="true" className="patrol-board-name-pencil">
            <PencilIcon size={16} />
          </span>
        </label>
        {/* One image rather than a meter and a figure, because the dots stop at a full patrol
            and a screen reader takes the figure for a date. */}
        <span
          aria-label={`${String(stats.scouts)} av ${String(patrolSize)} scouter`}
          className={isOverfull ? "patrol-board-size patrol-board-overfull" : "patrol-board-size"}
          role="img"
        >
          <DotMeter
            filled={Math.min(stats.scouts, patrolSize)}
            size="small"
            tone={isOverfull ? "danger" : "info"}
            total={patrolSize}
          />
          <span aria-hidden="true">
            {stats.scouts}/{patrolSize}
          </span>
        </span>
      </div>
      {isNameUnheld && (
        <p className="patrol-board-name-note" id={nameNote}>
          Namnet sparas när någon är med i patrullen.
        </p>
      )}
      <GenderBar genders={stats.genders} />
      <ul aria-label="Medlemmar" className="patrol-members">
        {props.children}
      </ul>
      <p className="patrol-members-empty" aria-hidden="true">
        Släpp här
      </p>
    </section>
  )
}
