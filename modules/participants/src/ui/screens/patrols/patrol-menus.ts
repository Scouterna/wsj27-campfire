import type { OverflowMenuItem } from "@scouterna/wsj27-campfire-ui"

import type { Participant } from "../../../model/Participant"
import {
  dealtOut,
  membersOf,
  patrolName,
  patrolSize,
  type PatrolDraft,
} from "../../../model/Patrol"
import type { DropTarget } from "./use-patrol-drag"
import type { PatrolsEditor } from "./use-patrols"

/**
 * The moves a person's menu offers – every patrol they are not in, each with how full it
 * already is, out of the one they are, and a way to open them.
 * @param people The unit's people, whom the patrols are counted over.
 * @param draft The arrangement.
 * @param person Whose menu.
 * @param move Moves the person to a patrol, or out of theirs.
 * @returns The entries.
 */
export function movesFor(
  people: readonly Participant[],
  draft: PatrolDraft,
  person: Participant,
  move: (memberNo: string, target: DropTarget) => void,
): readonly OverflowMenuItem[] {
  const current = draft.placements.get(person.memberNo)
  const patrols = draft.names
    .keys()
    .filter((index) => index !== current)
    .map((index): OverflowMenuItem => {
      const count = String(membersOf(people, draft, index).length)
      return {
        detail: {
          shown: `${count}/${String(patrolSize)}`,
          spoken: `${count} av ${String(patrolSize)}`,
        },
        label: `Till ${patrolName(draft, index)}`,
        onSelect: () => {
          move(person.memberNo, index)
        },
      }
    })
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
 * The page's menu: dealing the scouts in no patrol out over the patrols, picking everybody
 * in no patrol, and forgetting the changes since the last save. Each entry says what it
 * did, because a screen reader hears nothing of the boards.
 * @param people The unit's people.
 * @param editor The draft and its actions.
 * @param pick Picks exactly these people.
 * @returns The entries.
 */
export function pageMenu(
  people: readonly Participant[],
  editor: PatrolsEditor,
  pick: (memberNos: Iterable<string>) => void,
): readonly OverflowMenuItem[] {
  const { draft, writes } = editor
  const unplaced = membersOf(people, draft, undefined)
  const isEveryonePlaced = unplaced.length === 0
  return [
    isEveryonePlaced
      ? { label: "Fördela resten", unavailable: "Alla scouter har en patrull" }
      : {
          label: "Fördela resten",
          onSelect: () => {
            editor.update(dealtOut(people, draft, new Date()))
            editor.say("Resten är fördelade.")
          },
        },
    isEveryonePlaced
      ? { label: "Välj alla utan patrull", unavailable: "Alla scouter har en patrull" }
      : {
          label: "Välj alla utan patrull",
          onSelect: () => {
            pick(unplaced.map((person) => person.memberNo))
            editor.say(unplaced.length === 1 ? "1 vald." : `${String(unplaced.length)} valda.`)
          },
        },
    writes.length === 0
      ? { label: "Ångra ändringarna", unavailable: "Inget är ändrat" }
      : {
          label: "Ångra ändringarna",
          onSelect: () => {
            editor.reset()
            editor.say("Ändringarna är ångrade.")
          },
        },
  ]
}
