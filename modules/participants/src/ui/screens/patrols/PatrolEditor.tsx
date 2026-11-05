import { CheckIcon, PageActions } from "@scouterna/wsj27-campfire-ui"
import { useMemo, type ReactElement } from "react"

import { fullName, type Participant } from "../../../model/Participant"
import {
  membersOf,
  patrolName,
  patrolNames,
  patrolStats,
  placeName,
  renamed,
  sharedNames,
} from "../../../model/Patrol"
import { useCareSheets } from "../../use-care-sheets"
import { Carried } from "./Carried"
import { LeaveGuard } from "./LeaveGuard"
import { movesFor, pageMenu } from "./patrol-menus"
import { PatrolBoard } from "./PatrolBoard"
import { PatrolMember } from "./PatrolMember"
import { PatrolStatus } from "./PatrolStatus"
import { SelectionBar } from "./SelectionBar"
import { Tray } from "./Tray"
import { usePatrolMoves } from "./use-patrol-moves"
import { usePatrols } from "./use-patrols"
import { useSelection } from "./use-selection"
import { Warnings } from "./Warnings"

import "./PatrolEditor.css"

// A constant, because the chrome republishes what it is handed.
const saveIcon = <CheckIcon size={24} strokeWidth={2.2} />

/**
 * The people a leader divides.
 */
export interface PatrolEditorProps {
  /**
   * The unit's scouts, in reading order.
   */
  readonly people: readonly Participant[]
}

/**
 * The editor itself: the people in no patrol, then the patrols, each a board a person can
 * be carried to or moved to from their own menu – alone, or with everybody picked
 * alongside them. Nothing is stored until the leader saves, so the unit can be tried out
 * every which way first.
 * @param props The unit's people.
 * @returns The editor.
 */
export function PatrolEditor(props: PatrolEditorProps): ReactElement {
  const { people } = props
  const editor = usePatrols(people)
  const { draft, lastSave, save, writes } = editor
  const selection = useSelection()
  const { pick } = selection
  const unitCare = useCareSheets(people)
  const moves = usePatrolMoves(editor, selection)
  const { carried: carriedGroup, drag } = moves

  const shared = sharedNames(draft)
  const unplaced = membersOf(people, draft, undefined)
  const carried = people.find((person) => person.memberNo === drag?.memberNo)
  const failedNames = people
    .filter((person) => lastSave?.failed.some((write) => write.memberNo === person.memberNo))
    .map((person) => fullName(person))
  const canSave = writes.length > 0 && shared.length === 0
  const saveLabel = editor.isSaving ? "Sparar …" : "Spara"

  // Memoized, because a drag renders on every pointer move and the chrome republishes
  // what it is handed. It stays through the save, whose `onPress` then does nothing, so
  // the button that holds focus is not taken away before the answer is in.
  const action = useMemo(
    () => (canSave ? { icon: saveIcon, label: saveLabel, onPress: save } : undefined),
    [canSave, saveLabel, save],
  )
  const menu = useMemo(() => pageMenu(people, editor, pick), [people, editor, pick])

  const chip = (person: Participant): ReactElement => {
    const care = unitCare.byMemberNo.get(person.memberNo)?.care
    return (
      <PatrolMember
        isCarried={carriedGroup.includes(person.memberNo)}
        isLanded={moves.landed.has(person.memberNo)}
        isSelected={selection.picked.has(person.memberNo)}
        key={person.memberNo}
        moves={movesFor(people, draft, person, moves.moveFromMenu)}
        onOpenCare={() => {
          unitCare.onOpen(person.memberNo)
        }}
        onPointerDown={moves.pickUp(person.memberNo)}
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
      <PageActions action={action} menu={menu} />

      {/* Gone during a retry, so a second failure is a new alert rather than a silent line. */}
      <Warnings
        failed={editor.isSaving ? [] : failedNames}
        isPartial={(lastSave?.saved.length ?? 0) > 0}
        shared={shared}
      />
      {unitCare.notice}

      <Tray count={unplaced.length} isOver={drag?.over === "none"}>
        {unplaced.map((person) => chip(person))}
      </Tray>

      <div className="patrols-boards">
        {draft.names.map((name, index) => {
          const members = membersOf(people, draft, index)
          return (
            <PatrolBoard
              index={index}
              isOver={drag?.over === index}
              // Keyed by place, because a patrol is its place while its name is typed.
              key={`patrol-${String(index)}`}
              label={patrolName(draft, index)}
              name={name}
              onRename={(next) => {
                editor.update(renamed(draft, index, next))
              }}
              placeholder={placeName(index)}
              stats={patrolStats(members)}
            >
              {members.map((person) => chip(person))}
            </PatrolBoard>
          )
        })}
      </div>

      <div className="patrols-foot">
        <PatrolStatus editor={editor} />
        {selection.picked.size > 0 && (
          <SelectionBar
            canMove={moves.canMovePicked}
            count={selection.picked.size}
            isBesideSave={canSave}
            onClear={moves.letGo}
            onMove={moves.movePicked}
            patrols={patrolNames(draft)}
          />
        )}
      </div>

      {drag !== undefined && carried !== undefined && (
        <Carried alongside={carriedGroup.length - 1} drag={drag} person={carried} />
      )}

      {/* Outside the chips, so a press in it never reaches the drag on the chip behind. */}
      {unitCare.sheet}

      <LeaveGuard isUnsaved={writes.length > 0} />
    </div>
  )
}
