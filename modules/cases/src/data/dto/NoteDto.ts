import type { Note } from "../../model/Note"
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

  return {
    attachments: toAttachments(dto.attachments, caseId, id),
    authorMemberNo,
    caseId,
    createdAt,
    id,
    secrecyLevel: dto.secrecy_level,
    text: dto.note,
    title: typeof dto.title === "string" ? dto.title : "",
  }
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
