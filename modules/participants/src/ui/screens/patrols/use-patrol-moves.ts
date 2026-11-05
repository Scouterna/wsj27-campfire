import { useEffect, useRef, useState } from "react"

import { movedAll, patrolName } from "../../../model/Patrol"
import { usePatrolDrag, type Drag, type DropTarget, type PatrolDrag } from "./use-patrol-drag"
import type { PatrolsEditor } from "./use-patrols"
import type { Selection } from "./use-selection"

/**
 * The element a person's chip takes focus on.
 * @param memberNo Whose chip.
 * @returns The element's id.
 */
export function chipId(memberNo: string): string {
  return `patrol-member-${memberNo}`
}

/**
 * How people move between patrols, however they are moved.
 */
export interface PatrolMoves {
  /**
   * Whether moving everybody picked would move anybody – to a patrol by its place, or out
   * of their patrols for undefined.
   */
  readonly canMovePicked: (index: number | undefined) => boolean
  /**
   * Who is being carried – the person picked up, and everybody picked with them.
   */
  readonly carried: readonly string[]
  /**
   * The drag in progress, or undefined while nobody is carried.
   */
  readonly drag: Drag | undefined
  /**
   * The people just put down, so their chips can settle where they landed.
   */
  readonly landed: ReadonlySet<string>
  /**
   * Lets everybody go from the bar, and hands focus to the first of them, because the bar
   * goes with its button.
   */
  readonly letGo: () => void
  /**
   * Moves one person from their menu, as a carried person moves, and follows them with
   * focus.
   */
  readonly moveFromMenu: (memberNo: string, target: DropTarget) => void
  /**
   * Moves everybody picked from the bar – a patrol by its place, or out of their patrols
   * for undefined – and follows the first who moved with focus.
   */
  readonly movePicked: (index: number | undefined) => void
  /**
   * What a chip picks itself up with.
   */
  readonly pickUp: PatrolDrag["pickUp"]
}

/**
 * Moving people between patrols – carried or from a menu, alone or together. A picked
 * person carries everybody picked with them, and anybody else moves alone, which is how
 * one person can still be moved in the middle of picking others.
 * @param editor The draft the moves change.
 * @param selection Who is picked.
 * @returns The moves, and the drag in progress.
 */
export function usePatrolMoves(editor: PatrolsEditor, selection: Selection): PatrolMoves {
  const { draft } = editor
  const [landed, setLanded] = useState<ReadonlySet<string>>(new Set())
  // Whose chip takes focus once the move has drawn it.
  const followed = useRef<string | undefined>(undefined)

  const groupOf = (memberNo: string): readonly string[] =>
    selection.picked.has(memberNo) ? [...selection.picked] : [memberNo]

  const elsewhere = (group: readonly string[], index: number | undefined): readonly string[] =>
    group.filter((member) => draft.placements.get(member) !== index)

  const moveGroup = (group: readonly string[], index: number | undefined): void => {
    editor.update(movedAll(draft, group, index))
    setLanded(new Set(group))
    const who = group.length === 1 ? "1 flyttad" : `${String(group.length)} flyttade`
    editor.say(
      index === undefined ? `${who} ur patrullen.` : `${who} till ${patrolName(draft, index)}.`,
    )
    if (group.some((memberNo) => selection.picked.has(memberNo))) {
      selection.clear()
    }
  }

  const move = (memberNo: string, target: DropTarget): void => {
    const index = target === "none" ? undefined : target
    const group = elsewhere(groupOf(memberNo), index)
    if (group.length > 0) {
      moveGroup(group, index)
    }
  }

  const moveFromMenu = (memberNo: string, target: DropTarget): void => {
    followed.current = memberNo
    move(memberNo, target)
  }

  const canMovePicked = (index: number | undefined): boolean =>
    elsewhere([...selection.picked], index).length > 0

  const movePicked = (index: number | undefined): void => {
    const group = elsewhere([...selection.picked], index)
    if (group.length > 0) {
      followed.current = group[0]
      moveGroup(group, index)
    }
  }

  const letGo = (): void => {
    followed.current = [...selection.picked][0]
    selection.clear()
  }

  // What held focus goes with the move – the menu's trigger with the chip that remounts
  // under its new list, or the bar's button with the bar – so the reader's place would be
  // left on the body.
  useEffect(() => {
    const memberNo = followed.current
    if (memberNo === undefined) {
      return
    }
    followed.current = undefined
    document.querySelector<HTMLElement>(`#${chipId(memberNo)}`)?.focus()
  })

  const { drag, pickUp } = usePatrolDrag(move)
  return {
    canMovePicked,
    carried: drag === undefined ? [] : groupOf(drag.memberNo),
    drag,
    landed,
    letGo,
    moveFromMenu,
    movePicked,
    pickUp,
  }
}
