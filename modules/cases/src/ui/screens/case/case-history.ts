import { unitName } from "@scouterna/wsj27-campfire-ui"

import type { Attachment } from "../../../model/Attachment"
import { scopeOf, type Case } from "../../../model/Case"
import { asSeenBy } from "../../../model/CaseType"
import type { Note, PeopleChange } from "../../../model/Note"
import { nameOf, placingLine, type People } from "../../../model/Person"
import { noteAudience } from "../../../model/SecrecyLevel"

/**
 * One entry of the case's history – a note, or a moment something happened to the case.
 */
export interface HistoryEntry {
  /**
   * Who alone a note is for, when it is more secret than its case.
   */
  readonly audience?: string
  /**
   * When it happened, which orders the history.
   */
  readonly at: Date
  /**
   * The entry's body – the note's text, or the sentence telling the event.
   */
  readonly body: string
  /**
   * Whether the entry is an event rather than a note.
   */
  readonly isEvent: boolean
  /**
   * A key unique within the history.
   */
  readonly key: string
  /**
   * The pictures attached to a note, oldest first.
   */
  readonly pictures?: readonly Attachment[]
  /**
   * What whoever wrote a note is – their role, their function or unit – where the names
   * say.
   */
  readonly subtitle?: string
  /**
   * The entry's heading – who wrote the note, or what happened.
   */
  readonly title: string
}

// Constructed once, because every change of people in the history is told with it.
const swedishList = new Intl.ListFormat("sv", { type: "conjunction" })

/**
 * A change to who the case is about, told as the history tells it – "lade till Anna och Bo
 * och tog bort Cecilia".
 * @param change Who was added and removed.
 * @param people Everyone the history names, undefined while the names are loading.
 * @returns The words after the name of whoever made the change.
 */
function changeOf(change: PeopleChange, people: People | undefined): string {
  const names = (memberNos: readonly string[]): string =>
    swedishList.format(memberNos.map((memberNo) => nameOf(people, memberNo)))
  return [
    ...(change.added.length > 0 ? [`lade till ${names(change.added)}`] : []),
    ...(change.removed.length > 0 ? [`tog bort ${names(change.removed)}`] : []),
  ].join(" och ")
}

/**
 * A note as its entry in the history, under who wrote it and what they are.
 * @param item The case it is on.
 * @param note The note to tell.
 * @param who The name the history gives whoever wrote it.
 * @param people Everyone the history names, undefined while the names are loading.
 * @param ownUnit The one unit the reader leads, which the history does not name.
 * @returns The entry, a note rather than an event.
 */
function noteEntry(
  item: Case,
  note: Note,
  who: (author: string) => string,
  people: People | undefined,
  ownUnit: number | undefined,
): HistoryEntry {
  const subtitle = placingLine(people?.get(note.authorMemberNo), unitName, ownUnit)
  return {
    at: note.createdAt,
    body: note.text,
    isEvent: false,
    key: `note-${note.id}`,
    ...(note.attachments.length > 0 && { pictures: note.attachments }),
    // Only a note more secret than its case is marked, since the case already says who
    // sees everything else on it.
    ...(note.secrecyLevel > item.secrecyLevel && {
      audience: noteAudience(
        note.secrecyLevel,
        item.secrecyLevel,
        asSeenBy(scopeOf(item), ownUnit),
      ),
    }),
    ...(subtitle !== undefined && { subtitle }),
    title: who(note.authorMemberNo),
  }
}

/**
 * The case's history, newest first: its notes, each change to who it is about, the
 * moment it was opened, and – while it is closed – the moment it was closed. The service
 * keeps no record of a reopening, so a reopened case's history reads as if it had never
 * closed.
 * @param item The case whose history to tell.
 * @param notes The case's notes.
 * @param people Everyone the history names, undefined while the names are loading.
 * @param memberNo The reader's own member number, so their notes are marked as theirs.
 * @param ownUnit The one unit the reader leads, which the history does not name.
 * @returns The entries, newest first.
 */
export function historyOf(
  item: Case,
  notes: readonly Note[],
  people: People | undefined,
  memberNo: string | undefined,
  ownUnit?: number,
): readonly HistoryEntry[] {
  const who = (author: string): string => {
    const name = nameOf(people, author)
    return author === memberNo ? `${name} (du)` : name
  }

  const entries: HistoryEntry[] = notes.map((note) =>
    // The service tells a change of people in a note of its own, in its own words, so
    // the history tells it as one of its events instead.
    note.peopleChange === undefined
      ? noteEntry(item, note, who, people, ownUnit)
      : {
          at: note.createdAt,
          body: `${nameOf(people, note.authorMemberNo)} ${changeOf(note.peopleChange, people)}.`,
          isEvent: true,
          key: `note-${note.id}`,
          title: "Vem ärendet gäller ändrades",
        },
  )
  entries.push({
    at: item.createdAt,
    body: `${nameOf(people, item.creatorMemberNo)} skapade ärendet.`,
    isEvent: true,
    key: "created",
    title: "Ärendet skapades",
  })
  if (item.isClosed && item.closedAt !== undefined) {
    const closer =
      item.closedByMemberNo === undefined ? "Någon" : nameOf(people, item.closedByMemberNo)
    entries.push({
      at: item.closedAt,
      body: `${closer} avslutade ärendet.`,
      isEvent: true,
      key: "closed",
      title: "Ärendet avslutades",
    })
  }
  return entries.toSorted((left, right) => right.at.getTime() - left.at.getTime())
}
