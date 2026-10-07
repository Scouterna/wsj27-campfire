import { DotMeter } from "@scouterna/wsj27-campfire-ui"
import { useId, type ReactElement, type ReactNode } from "react"

import { careNeedName, type CareNeed } from "../../../model/Care"
import { genderName, type Gender } from "../../../model/Gender"
import { fullName, type Participant } from "../../../model/Participant"
import { patrolSize, type PatrolStats } from "../../../model/Patrol"
import { GenderMark } from "../../components/gender/GenderMark"

// Constructed once, because a formatter is expensive to build and free to reuse.
const oneDecimal = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 })
const whole = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 })

// The order the genders are drawn in, the bar's segments and the legend alike.
const genderOrder: readonly Gender[] = ["kvinna", "man", "annat", "okant"]

/**
 * The patrol a `PatrolBoard` is, and what it holds.
 */
export interface PatrolBoardProps {
  /**
   * How many of the patrol need each kind of care. Empty while nothing is known, and for a
   * patrol where nobody needs any.
   */
  readonly care: ReadonlyMap<CareNeed, number>
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
   * The unit's leader who leads the patrol, or undefined while nobody does.
   */
  readonly leader: Participant | undefined
  /**
   * Every leader of the unit, each with the name of the patrol they lead elsewhere, so
   * the picker can say whom choosing them moves.
   */
  readonly leaders: readonly { readonly leads?: string; readonly person: Participant }[]
  /**
   * Called with the leader chosen, or undefined when the patrol is left without one.
   */
  readonly onLead: (memberNo: string | undefined) => void
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
 * The patrol's scouts by gender, as one bar split in proportion, with the counts beside
 * it. Read aloud as the counts, since the bar only draws them.
 * @param props The counts.
 * @returns The bar and its legend, or nothing for a patrol without scouts.
 */
function GenderBar(props: GenderBarProps): ReactElement | null {
  const count = (gender: Gender): number => props.genders.get(gender) ?? 0
  const present = genderOrder.filter((gender) => count(gender) > 0)
  if (present.length === 0) {
    return null
  }
  const spoken = present
    .map((gender) => `${String(count(gender))} ${genderName(gender).toLowerCase()}`)
    .join(", ")
  return (
    <div className="patrol-genders">
      <span aria-hidden="true" className="patrol-genders-bar">
        {present.map((gender) => (
          <span
            className={`patrol-genders-${gender}`}
            key={gender}
            // The share is data, so it is the one style the stylesheet cannot hold.
            style={{ flexGrow: count(gender) }}
          />
        ))}
      </span>
      <span aria-label={spoken} className="patrol-genders-legend" role="img">
        {present.map((gender) => (
          <span key={gender}>
            {gender === "okant" ? "?" : <GenderMark gender={gender} />}
            {count(gender)}
          </span>
        ))}
      </span>
    </div>
  )
}

/**
 * The figures `Facts` lists.
 */
interface FactsProps {
  /**
   * How many need each kind of care.
   */
  readonly care: ReadonlyMap<CareNeed, number>
  /**
   * The patrol's figures.
   */
  readonly stats: PatrolStats
}

/**
 * The figures under a patrol's name – how old its scouts are, how many kårer they come
 * from and how many share the commonest, how far apart they live, and how many need
 * what care. A
 * figure nobody in the patrol has is left out rather than shown empty.
 * @param props The figures, and the care counts.
 * @returns The list of facts.
 */
function Facts(props: FactsProps): ReactElement {
  const { ages, groups, spreadKm } = props.stats
  return (
    <dl className="patrol-facts">
      {ages === undefined ? null : (
        <div>
          <dt>Ålder</dt>
          <dd>
            {ages.youngest === ages.oldest
              ? `${String(ages.youngest)} år`
              : `${String(ages.youngest)}–${String(ages.oldest)} år`}{" "}
            <span className="patrol-facts-quiet">snitt {oneDecimal.format(ages.average)}</span>
          </dd>
        </div>
      )}
      {groups.count === 0 ? null : (
        <div>
          <dt>Kårer</dt>
          <dd>
            {groups.count}
            {groups.count > 1 && groups.largest !== undefined && groups.largest.count > 1 && (
              <span className="patrol-facts-quiet">
                {" "}
                · flest från {groups.largest.name} ({groups.largest.count})
              </span>
            )}
          </dd>
        </div>
      )}
      {spreadKm === undefined ? null : (
        <div>
          <dt>Bor isär</dt>
          <dd>
            {whole.format(spreadKm)} km <span className="patrol-facts-quiet">i snitt</span>
          </dd>
        </div>
      )}
      {props.care.size === 0 ? null : (
        <div>
          <dt>Hänsyn</dt>
          <dd>
            {[...props.care]
              .map(([need, count]) => `${careNeedName(need)} ${String(count)}`)
              .join(" · ")}
          </dd>
        </div>
      )}
    </dl>
  )
}

/**
 * What a `LeaderPicker` offers, and what choosing does.
 */
type LeaderPickerProps = Pick<PatrolBoardProps, "leader" | "leaders" | "onLead"> & {
  /**
   * The patrol's name, for the picker's label.
   */
  readonly patrol: string
}

/**
 * Who leads the patrol, as a picker of the unit's leaders – marked in the caution tone
 * while nobody does, so a patrol without a leader stands out among the rest. A leader
 * who leads another patrol says so, because choosing them swaps the two.
 * @param props The leader, the unit's leaders, and what choosing does.
 * @returns The picker.
 */
function LeaderPicker(props: LeaderPickerProps): ReactElement {
  const { leader, leaders, onLead, patrol } = props
  const id = useId()
  return (
    <div className={leader === undefined ? "patrol-leader patrol-leader-missing" : "patrol-leader"}>
      <label htmlFor={id}>{leader === undefined ? "Ledare saknas" : "Ledare"}</label>
      <select
        aria-label={`Ledare för ${patrol}`}
        className="patrol-leader-select"
        id={id}
        onChange={(event) => {
          onLead(event.target.value === "" ? undefined : event.target.value)
        }}
        value={leader?.memberNo ?? ""}
      >
        <option value="">{leader === undefined ? "Välj ledare …" : "Ingen ledare"}</option>
        {leaders.map(({ leads, person }) => (
          <option key={person.memberNo} value={person.memberNo}>
            {leads === undefined || person.memberNo === leader?.memberNo
              ? fullName(person)
              : `${fullName(person)} – byter med ${leads}`}
          </option>
        ))}
      </select>
    </div>
  )
}

/**
 * One patrol as a board a person can be dropped on: its name, as a field the leader
 * types into, how full it is against the nine a patrol holds, who leads it, how it
 * mixes, and its scouts. The whole board is the drop target, so a person can be let go anywhere on it.
 * @param props The patrol, its figures, and its people.
 * @returns The board.
 */
export function PatrolBoard(props: PatrolBoardProps): ReactElement {
  const { care, index, isOver, leader, leaders, name, onLead, onRename, placeholder, stats } = props
  const isOverfull = stats.scouts > patrolSize
  return (
    <section
      aria-label={name.trim() === "" ? placeholder : name.trim()}
      className={isOver ? "patrol-board patrol-board-over" : "patrol-board"}
      data-patrol-drop={index}
    >
      <div className="patrol-board-heading">
        <input
          aria-label={`Namn på ${placeholder.toLowerCase()}`}
          className="patrol-board-name"
          enterKeyHint="done"
          maxLength={40}
          onChange={(event) => {
            onRename(event.target.value)
          }}
          placeholder={placeholder}
          value={name}
        />
        <span
          className={isOverfull ? "patrol-board-size patrol-board-overfull" : "patrol-board-size"}
        >
          <DotMeter
            filled={Math.min(stats.scouts, patrolSize)}
            size="small"
            tone={isOverfull ? "danger" : "info"}
            total={patrolSize}
          />
          <span>
            {stats.scouts}/{patrolSize}
          </span>
        </span>
      </div>
      <LeaderPicker
        leader={leader}
        leaders={leaders}
        onLead={onLead}
        patrol={name.trim() === "" ? placeholder : name.trim()}
      />
      <GenderBar genders={stats.genders} />
      <Facts care={care} stats={stats} />
      <ul aria-label="Medlemmar" className="patrol-members">
        {props.children}
      </ul>
      <p className="patrol-board-empty" aria-hidden="true">
        Släpp här
      </p>
    </section>
  )
}
