import type { Note, PeopleChange } from "../../model/Note"
import { isSecrecyLevel } from "../../model/SecrecyLevel"
import { toAttachments } from "./AttachmentDto"
import { isRecord, toDate, toId } from "./validation"

/**
 * One note as the cases service sends it. Every field is `unknown`, because the service
 * is built separately and changes shape, so the converter decides whether what arrived is
 * usable.
 */
export interface NoteDto {
  readonly attachments?: unknown
  readonly case_id?: unknown
  readonly created_at?: unknown
  readonly creator_id?: unknown
  readonly extra_access?: unknown
  readonly id?: unknown
  readonly note?: unknown
  readonly secrecy_level?: unknown
  readonly tags?: unknown
  readonly title?: unknown
}

/**
 * One note as the domain knows it, or undefined when the payload is not one. Undefined
 * rather than a throw, because a case drops the note it cannot read and shows the rest. A
 * level this module does not know makes the note unreadable too, because who reads it
 * could not be said.
 * @param value The note the service sent.
 * @returns The note, or undefined when it is not usable.
 */
export function toNote(value: unknown): Note | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const dto: NoteDto = value

  const id = toId(dto.id)
  const caseId = toId(dto.case_id)
  const createdAt = toDate(dto.created_at)
  const authorMemberNo = toId(dto.creator_id)
  if (
    id === undefined ||
    caseId === undefined ||
    createdAt === undefined ||
    authorMemberNo === undefined ||
    typeof dto.note !== "string" ||
    !isSecrecyLevel(dto.secrecy_level)
  ) {
    return undefined
  }

  const title = typeof dto.title === "string" ? dto.title : ""
  const peopleChange = toPeopleChange(title, dto.note)
  return {
    attachments: toAttachments(dto.attachments, caseId, id),
    authorMemberNo,
    caseId,
    createdAt,
    id,
    ...(peopleChange !== undefined && { peopleChange }),
    secrecyLevel: dto.secrecy_level,
    text: dto.note,
    title,
  }
}

/**
 * The title the service writes its own note under when who a case is about changes.
 */
const peopleChangeTitle = "Changed who the case is about"

/**
 * Who a change to who the case is about added and removed, read from the note the service
 * writes for it – a line each, "Added: 1, 2" and "Removed: 3", either left out when it
 * names nobody.
 * @param title The note's heading.
 * @param text The note's text.
 * @returns The change, or undefined for a note somebody wrote.
 */
function toPeopleChange(title: string, text: string): PeopleChange | undefined {
  if (title !== peopleChangeTitle) {
    return undefined
  }
  const listed = (label: string): readonly string[] => {
    const line = text.split("\n").find((candidate) => candidate.startsWith(`${label}:`))
    return (line?.slice(label.length + 1).split(",") ?? [])
      .map((memberNo) => memberNo.trim())
      .filter((memberNo) => /^\d+$/u.test(memberNo))
  }
  return { added: listed("Added"), removed: listed("Removed") }
}

/**
 * Every readable note of a list payload, in the order the service sent them – newest
 * first.
 * @param value The body the cases service answered with.
 * @returns The notes, with the unreadable ones dropped.
 */
export function toNotes(value: unknown): readonly Note[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map((row: unknown) => toNote(row)).filter((row): row is Note => row !== undefined)
}
