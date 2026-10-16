import {
  Button,
  Card,
  CheckIcon,
  PageActions,
  PageTitle,
  type OverflowMenuItem,
} from "@scouterna/wsj27-campfire-ui"
import { useMemo, type ReactElement, type ReactNode } from "react"

import { useViewer } from "../../../data/viewer"
import { careCounts, type CareNeed } from "../../../model/Care"
import { fullName, type Participant } from "../../../model/Participant"
import {
  dealtOut,
  isPatrolMember,
  leaderOf,
  membersOf,
  patrolName,
  patrolStats,
  renamed,
  sharedNames,
  withLeader,
  type PatrolDraft,
} from "../../../model/Patrol"
import { locateTown } from "../../components/unitcard/map/geography"
import { useParticipants } from "../participants/use-participants"
import { PatrolBoard } from "./PatrolBoard"
import { PatrolMember } from "./PatrolMember"
import { SelectionBar } from "./SelectionBar"
import type { Drag, DropTarget } from "./use-patrol-drag"
import { usePatrolMoves } from "./use-patrol-moves"
import { usePatrols, type PatrolsEditor } from "./use-patrols"
import { useSelection, type Selection } from "./use-selection"
import { useUnitCare, type UnitCare } from "./use-unit-care"

import "./PatrolsScreen.css"

/**
 * How a count of changes reads: "1 ändring", "3 ändringar".
 * @param count How many.
 * @returns The count with its noun.
 */
function changes(count: number): string {
  return count === 1 ? "1 ändring" : `${String(count)} ändringar`
}

/**
 * The moves a person's menu offers – every patrol they are not in, out of the one they
 * are, and a way to open them.
 * @param draft The arrangement.
 * @param person Whose menu.
 * @param move Moves the person to a patrol, or out of theirs.
 * @returns The entries.
 */
function movesFor(
  draft: PatrolDraft,
  person: Participant,
  move: (memberNo: string, target: DropTarget) => void,
): readonly OverflowMenuItem[] {
  const current = draft.placements.get(person.memberNo)
  const patrols = draft.names
    .keys()
    .filter((index) => index !== current)
    .map((index): OverflowMenuItem => ({
      label: `Till ${patrolName(draft, index)}`,
      onSelect: () => {
        move(person.memberNo, index)
      },
    }))
    .toArray()
  const out: readonly OverflowMenuItem[] =
    current === undefined
      ? []
      : [
          {
            label: "Ur patrullen",
            onSelect: () => {
              move(person.memberNo, "none")
            },
          },
        ]
  return [
    ...patrols,
    ...out,
    "divider",
    {
      label: `Visa ${person.firstName}`,
      link: { params: { memberNo: person.memberNo }, to: "/participants/$memberNo" },
    },
  ]
}

/**
 * The page's menu: dealing the scouts out – the ones in no patrol, or everybody from
 * scratch – picking everybody in no patrol, and forgetting the changes since the last
 * save.
 * @param people The unit's people.
 * @param editor The draft and its actions.
 * @param selection Who is picked.
 * @returns The entries.
 */
function pageMenu(
  people: readonly Participant[],
  editor: PatrolsEditor,
  selection: Selection,
): OverflowMenuItem[] {
  const { draft, writes } = editor
  const unplaced = scoutsOf(people, draft, undefined)
  const isEveryonePlaced = unplaced.length === 0
  return [
    isEveryonePlaced
      ? { label: "Fördela resten", unavailable: "Alla scouter har en patrull" }
      : {
          label: "Fördela resten",
          onSelect: () => {
            editor.update(dealtOut(people, draft, "unplaced"))
          },
        },
    {
      label: "Blanda om alla",
      onSelect: () => {
        editor.update(dealtOut(people, draft, "all"))
      },
    },
    isEveryonePlaced
      ? { label: "Välj alla utan patrull", unavailable: "Alla har en patrull" }
      : {
          label: "Välj alla utan patrull",
          onSelect: () => {
            selection.pick(unplaced.map((person) => person.memberNo))
          },
        },
    writes.length === 0
      ? { label: "Ångra ändringarna", unavailable: "Inget är ändrat" }
      : { label: "Ångra ändringarna", onSelect: editor.reset },
  ]
}

/**
 * The scouts in one patrol, or in none – the people the chips are for, since a patrol's
 * leader is chosen apart from them.
 * @param people The unit's people.
 * @param draft The arrangement.
 * @param index The patrol's place, or undefined for the scouts in none.
 * @returns The scouts there, in the order they were handed in.
 */
function scoutsOf(
  people: readonly Participant[],
  draft: PatrolDraft,
  index: number | undefined,
): readonly Participant[] {
  return membersOf(people, draft, index).filter((person) => person.role === "deltagare")
}

/**
 * The unit's leaders, each with the patrol they lead, for the leader pickers.
 * @param people The unit's people.
 * @param draft The arrangement.
 * @returns The leaders, in reading order.
 */
function leadersOf(
  people: readonly Participant[],
  draft: PatrolDraft,
): readonly { readonly leads?: string; readonly person: Participant }[] {
  return people
    .filter((person) => person.role === "ledare")
    .map((person) => {
      const index = draft.placements.get(person.memberNo)
      return index === undefined ? { person } : { leads: patrolName(draft, index), person }
    })
}

/**
 * The line under the title: how many of the scouts have a patrol, how much is left to
 * save, or that the save went through.
 * @param people The unit's people.
 * @param editor The draft and its actions.
 * @returns The line.
 */
function statusOf(people: readonly Participant[], editor: PatrolsEditor): string {
  if (editor.isSaving) {
    return "Sparar …"
  }
  if (editor.writes.length === 0 && editor.lastSave?.failed.length === 0) {
    return "Patrullerna är sparade."
  }
  const scouts = people.filter((person) => person.role === "deltagare")
  const placed = scouts.filter((scout) => editor.draft.placements.has(scout.memberNo))
  const count = `${String(placed.length)} av ${String(scouts.length)} scouter i en patrull`
  return editor.writes.length === 0
    ? count
    : `${count} · ${changes(editor.writes.length)} att spara`
}

/**
 * What the tray of people in no patrol holds, and whether a person is carried over it.
 */
interface TrayProps {
  /**
   * The chips of the people in no patrol.
   */
  readonly children: ReactNode
  /**
   * How many people it holds.
   */
  readonly count: number
  /**
   * Whether a carried person is over the tray, so it can say it will take them.
   */
  readonly isOver: boolean
}

/**
 * The people in no patrol – where a unit nobody has divided starts, and where a person
 * taken out of a patrol lands.
 * @param props The chips, their count, and whether a drag is over it.
 * @returns The card.
 */
function Tray(props: TrayProps): ReactElement {
  return (
    <Card aside={<span aria-hidden="true">{props.count} st</span>} title="Utan patrull">
      <div
        className={props.isOver ? "patrols-tray patrols-tray-over" : "patrols-tray"}
        data-patrol-drop="none"
      >
        <ul aria-label="Utan patrull" className="patrol-members">
          {props.children}
        </ul>
        <p aria-hidden="true" className="patrol-board-empty">
          Alla har en patrull. Dra hit någon för att ta ur dem.
        </p>
      </div>
    </Card>
  )
}

/**
 * How many of a patrol's scouts need each kind of care.
 * @param members The patrol's people.
 * @param unitCare The care the unit needs.
 * @returns The counts.
 */
function careOfScouts(
  members: readonly Participant[],
  unitCare: UnitCare,
): ReadonlyMap<CareNeed, number> {
  return careCounts(
    members
      .filter((person) => person.role === "deltagare")
      .map((person) => unitCare.byMemberNo.get(person.memberNo)?.care ?? { needs: [] }),
  )
}

/**
 * What the editor has to warn about.
 */
interface WarningsProps {
  /**
   * The people whose patrol the last save could not store.
   */
  readonly failed: readonly string[]
  /**
   * Whether the unit's care could not be read.
   */
  readonly isCareUnknown: boolean
  /**
   * The names two patrols share.
   */
  readonly shared: readonly string[]
}

/**
 * The warnings over the patrols – care that could not be read, two patrols under one
 * name, and a save that did not land for everybody. Nothing when all is well.
 * @param props What to warn about.
 * @returns The warnings.
 */
function Warnings(props: WarningsProps): ReactElement {
  const { failed, isCareUnknown, shared } = props
  return (
    <>
      {isCareUnknown && (
        <p className="patrols-warning" role="alert">
          Hälsouppgifterna kunde inte hämtas, så ingens behov visas.
        </p>
      )}
      {shared.length > 0 && (
        <p className="patrols-warning" role="alert">
          Två patruller heter {shared.join(" och ")}. Ge dem olika namn innan du sparar.
        </p>
      )}
      {failed.length > 0 && (
        <p className="patrols-warning" role="alert">
          Det gick inte att spara för {failed.join(", ")}. Resten är sparat – försök igen.
        </p>
      )}
    </>
  )
}

/**
 * The drag a `Carried` copy follows, and whose chip it copies.
 */
interface CarriedProps {
  /**
   * How many are carried along with the person whose chip was picked up.
   */
  readonly alongside: number
  /**
   * The drag in progress.
   */
  readonly drag: Drag
  /**
   * The person whose chip was picked up.
   */
  readonly person: Participant
}

/**
 * The copy of a chip that follows the pointer, saying how many more come along.
 * @param props The drag, who is carried, and how many with them.
 * @returns The copy.
 */
function Carried(props: CarriedProps): ReactElement {
  const { alongside, drag, person } = props
  return (
    <div
      aria-hidden="true"
      className="patrols-carried"
      // Where the pointer is, which changes every frame.
      style={{
        transform: `translate(${String(drag.x)}px, ${String(drag.y)}px)`,
        width: `${String(drag.width)}px`,
      }}
    >
      {fullName(person)}
      {alongside > 0 && <span className="patrols-carried-more">+{alongside}</span>}
    </div>
  )
}

/**
 * The page's primary action while there is something to save.
 * @param editor The draft and its save.
 * @returns The action.
 */
function saveActionFor(editor: PatrolsEditor): {
  readonly icon: ReactElement
  readonly label: string
  readonly onPress: () => void
} {
  return { icon: <CheckIcon size={24} strokeWidth={2.2} />, label: "Spara", onPress: editor.save }
}

/**
 * The people a leader divides.
 */
interface PatrolEditorProps {
  /**
   * The unit's scouts and leaders, in reading order.
   */
  readonly people: readonly Participant[]
}

/**
 * The editor itself: the people in no patrol, then the four patrols, each a board a
 * person can be carried to or moved to from their own menu – alone, or with everybody
 * picked alongside them. Nothing is stored until the leader saves, so the unit can be
 * tried out every which way first.
 * @param props The unit's people.
 * @returns The editor.
 */
function PatrolEditor(props: PatrolEditorProps): ReactElement {
  const { people } = props
  const editor = usePatrols(people)
  const { draft, lastSave, writes } = editor
  const selection = useSelection()
  const unitCare = useUnitCare()
  const {
    carried: carriedGroup,
    drag,
    landed,
    move,
    moveGroup,
    pickUp,
  } = usePatrolMoves(editor, selection)
  const today = useMemo(() => new Date(), [])
  const leaders = leadersOf(people, draft)

  const shared = sharedNames(draft)
  const carried = people.find((person) => person.memberNo === drag?.memberNo)
  const failedNames = people
    .filter((person) => lastSave?.failed.some((write) => write.memberNo === person.memberNo))
    .map((person) => fullName(person))
  const canSave = writes.length > 0 && shared.length === 0 && !editor.isSaving

  const chip = (person: Participant): ReactElement => {
    const care = unitCare.byMemberNo.get(person.memberNo)
    return (
      <PatrolMember
        isCarried={carriedGroup.includes(person.memberNo)}
        isLanded={landed.has(person.memberNo)}
        isSelected={selection.picked.has(person.memberNo)}
        key={person.memberNo}
        moves={movesFor(draft, person, move)}
        onPointerDown={pickUp(person.memberNo)}
        onToggle={() => {
          selection.toggle(person.memberNo)
        }}
        person={person}
        {...(care !== undefined && { care })}
      />
    )
  }

  return (
    <div className={drag === undefined ? "patrols" : "patrols patrols-dragging"}>
      <PageActions
        action={canSave ? saveActionFor(editor) : undefined}
        menu={pageMenu(people, editor, selection)}
      />

      <p className="patrols-status" role="status">
        {statusOf(people, editor)}
      </p>
      <Warnings failed={failedNames} isCareUnknown={unitCare.isUnknown} shared={shared} />

      <Tray count={scoutsOf(people, draft, undefined).length} isOver={drag?.over === "none"}>
        {scoutsOf(people, draft, undefined).map((person) => chip(person))}
      </Tray>

      <div className="patrols-boards">
        {draft.names.map((name, index) => {
          const members = membersOf(people, draft, index)
          return (
            <PatrolBoard
              care={careOfScouts(members, unitCare)}
              index={index}
              isOver={drag?.over === index}
              leader={leaderOf(people, draft, index)}
              leaders={leaders}
              onLead={(memberNo) => {
                editor.update(withLeader(people, draft, index, memberNo))
              }}
              // Keyed by place, because a patrol is its place while its name is typed.
              key={`patrol-${String(index)}`}
              name={name}
              onRename={(next) => {
                editor.update(renamed(draft, index, next))
              }}
              placeholder={`Patrull ${String(index + 1)}`}
              stats={patrolStats(members, today, locateTown)}
            >
              {scoutsOf(people, draft, index).map((person) => chip(person))}
            </PatrolBoard>
          )
        })}
      </div>

      {selection.picked.size > 0 && (
        <SelectionBar
          count={selection.picked.size}
          onClear={selection.clear}
          onMove={(index) => {
            moveGroup([...selection.picked], index)
          }}
          patrols={draft.names
            .keys()
            .map((index) => patrolName(draft, index))
            .toArray()}
        />
      )}

      {drag !== undefined && carried !== undefined && (
        <Carried alongside={carriedGroup.length - 1} drag={drag} person={carried} />
      )}
    </div>
  )
}

/**
 * Patruller: a leader divides their unit into its four patrols by carrying people
 * between them, or moving them from each person's menu, with each patrol's size, gender
 * mix, ages, kårer, and how far apart its people live beside it – and saves once the unit
 * looks the way the leaders want it.
 *
 * Only a unit's own leaders may set its patrols, so anybody else is told so rather than
 * shown an editor whose save the service would refuse.
 * @returns The screen.
 */
export function PatrolsScreen(): ReactElement {
  const viewer = useViewer()
  const { error, isPending, people, refetch } = useParticipants()
  const unit = viewer.unitNumber
  const members = useMemo(
    () => people.filter((person) => person.unit?.number === unit && isPatrolMember(person)),
    [people, unit],
  )

  if (unit === undefined) {
    return (
      <>
        <PageTitle title="Patruller" />
        <p className="patrols-status">Patrullerna delas in av avdelningens egna ledare.</p>
      </>
    )
  }

  if (isPending) {
    return (
      <>
        <PageTitle title="Patruller" />
        <p className="patrols-status" role="status">
          Hämtar avdelningen …
        </p>
      </>
    )
  }

  if (error !== null) {
    return (
      <>
        <PageTitle title="Patruller" />
        <p className="patrols-status" role="status">
          Avdelningen kunde inte hämtas.
        </p>
        <Button label="Försök igen" onPress={refetch} />
      </>
    )
  }

  return (
    <>
      <PageTitle title="Patruller" />
      <PatrolEditor people={members} />
    </>
  )
}
