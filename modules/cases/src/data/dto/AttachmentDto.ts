import type { Attachment } from "../../model/Attachment"
import { attachmentUrl } from "../case-urls"
import { isRecord, toId } from "./validation"

/**
 * One picture as the cases service lists it on its note, with only the keys this module
 * reads. Every field is `unknown`, because the service is built separately and changes
 * shape.
 */
export interface AttachmentDto {
  readonly height?: unknown
  readonly id?: unknown
  readonly width?: unknown
}

/**
 * A side of a stored picture, which is a whole number of pixels, and at least one.
 * @param value The side the service sent.
 * @returns The side, or undefined when it is not one.
 */
function toSide(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : undefined
}

/**
 * One picture as the domain knows it, with where it is read, or undefined when the payload
 * is not one – a picture that cannot be fetched or framed is left out rather than shown
 * broken.
 * @param value The picture the service listed.
 * @param caseId The case its note is on.
 * @param noteId Its note.
 * @returns The picture, or undefined when it is not usable.
 */
export function toAttachment(
  value: unknown,
  caseId: string,
  noteId: string,
): Attachment | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const dto: AttachmentDto = value
  const id = toId(dto.id)
  const width = toSide(dto.width)
  const height = toSide(dto.height)
  if (id === undefined || width === undefined || height === undefined) {
    return undefined
  }
  return {
    height,
    id,
    picture: attachmentUrl(caseId, noteId, id, false),
    thumbnail: attachmentUrl(caseId, noteId, id, true),
    width,
  }
}

/**
 * Every usable picture of a note's list, in the order the service sent them – oldest
 * first. A missing list is read as none.
 * @param value The list the service sent.
 * @param caseId The case the note is on.
 * @param noteId The note the pictures are on.
 * @returns The pictures, with the unusable ones dropped.
 */
export function toAttachments(
  value: unknown,
  caseId: string,
  noteId: string,
): readonly Attachment[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .map((row: unknown) => toAttachment(row, caseId, noteId))
    .filter((row): row is Attachment => row !== undefined)
}
