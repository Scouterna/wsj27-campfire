import { useState } from "react"

import { movedAll } from "../../../model/Patrol"
import { usePatrolDrag, type Drag, type DropTarget, type PatrolDrag } from "./use-patrol-drag"
import type { PatrolsEditor } from "./use-patrols"
import type { Selection } from "./use-selection"

/**
 * How people move between patrols, however they are moved.
 */
export interface PatrolMoves {
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
   * Moves one person, and everybody picked with them when they are picked.
   */
  readonly move: (memberNo: string, target: DropTarget) => void
  /**
   * Moves a group together – a patrol by its place, or out of their patrols for
   * undefined – and lets the picked go once they have moved.
   */
  readonly moveGroup: (group: readonly string[], index: number | undefined) => void
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

  const groupOf = (memberNo: string): readonly string[] =>
    selection.picked.has(memberNo) ? [...selection.picked] : [memberNo]

  const moveGroup = (group: readonly string[], index: number | undefined): void => {
    editor.update(movedAll(draft, group, index))
    setLanded(new Set(group))
    if (group.some((memberNo) => selection.picked.has(memberNo))) {
      selection.clear()
    }
  }

  const move = (memberNo: string, target: DropTarget): void => {
    const index = target === "none" ? undefined : target
    const group = groupOf(memberNo).filter((member) => draft.placements.get(member) !== index)
    if (group.length > 0) {
      moveGroup(group, index)
    }
  }

  const { drag, pickUp } = usePatrolDrag(move)
  return {
    carried: drag === undefined ? [] : groupOf(drag.memberNo),
    drag,
    landed,
    move,
    moveGroup,
    pickUp,
  }
}
