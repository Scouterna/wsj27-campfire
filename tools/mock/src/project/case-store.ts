import { seededAt, cases as seededCases } from "../../seed/cases.ts"

/**
 * One row of the cases service's `cases` table. Times are milliseconds since the epoch, and
 * member numbers are integers of the table's BIGINT size.
 */
export interface CaseRecord {
  readonly aboutPersonId: bigint | undefined
  assignedToId: bigint | undefined
  closed: boolean
  closedAt: number | undefined
  closedById: bigint | undefined
  readonly createdAt: number
  readonly creatorId: bigint
  extraAccess: readonly bigint[]
  readonly id: number
  latestNoteAt: number | undefined
  readonly secrecyLevel: number
  tags: readonly string[]
  title: string
  readonly troop: string
  readonly type: string
}

/**
 * One row of the cases service's `case_notes` table.
 */
export interface NoteRecord {
  readonly caseId: number
  readonly createdAt: number
  readonly creatorId: bigint
  readonly id: number
  readonly note: string
  readonly secrecyLevel: number
  tags: readonly string[]
  readonly title: string
}

/**
 * One row of the cases service's `case_note_attachments` table, with the two files the service
 * keeps beside it – the picture and its thumbnail, both JPEGs.
 */
export interface AttachmentRecord {
  readonly caseId: number
  readonly contentType: string
  readonly createdAt: number
  readonly creatorId: bigint
  readonly filename: string
  readonly height: number
  readonly id: number
  readonly noteId: number
  readonly picture: Uint8Array
  readonly size: number
  readonly thumbnail: Uint8Array
  readonly width: number
}

/**
 * What a new attachment is given, beside the note it is attached to; the table fills in the rest.
 */
export type NewAttachment = Omit<
  AttachmentRecord,
  "caseId" | "contentType" | "id" | "noteId" | "size"
>

/**
 * What a new case is given; the table fills in the rest.
 */
export type NewCase = Omit<CaseRecord, "closed" | "closedAt" | "closedById" | "id" | "latestNoteAt">

/**
 * What a new note is given, beside the case it is written in.
 */
export type NewNote = Omit<NoteRecord, "caseId" | "id">

/**
 * The cases service's tables, in memory. Ids start at 1 and only grow, as a BIGSERIAL
 * column's do, because the service deletes nothing.
 */
export class CaseStore {
  readonly attachments: AttachmentRecord[] = []
  readonly cases: CaseRecord[] = []
  readonly notes: NoteRecord[] = []

  /**
   * Inserts an attachment on a note. Its content type is always a JPEG's, because the service
   * stores every picture re-encoded as one.
   * @param note The note the picture is attached to.
   * @param fields What the attachment is given.
   * @returns The stored attachment.
   */
  addAttachment(note: NoteRecord, fields: NewAttachment): AttachmentRecord {
    const record = {
      ...fields,
      caseId: note.caseId,
      contentType: "image/jpeg",
      id: this.attachments.length + 1,
      noteId: note.id,
      size: fields.picture.byteLength,
    }
    this.attachments.push(record)
    return record
  }

  /**
   * Inserts a case, open and without notes.
   * @param fields What the case is given.
   * @returns The stored case.
   */
  addCase(fields: NewCase): CaseRecord {
    const record: CaseRecord = {
      ...fields,
      closed: false,
      closedAt: undefined,
      closedById: undefined,
      id: this.cases.length + 1,
      latestNoteAt: undefined,
    }
    this.cases.push(record)
    return record
  }

  /**
   * Inserts a note and moves its case's `latestNoteAt` to it, as one transaction does in the
   * service.
   * @param record The case the note is written in.
   * @param fields What the note is given.
   * @returns The stored note.
   */
  addNote(record: CaseRecord, fields: NewNote): NoteRecord {
    const note = { ...fields, caseId: record.id, id: this.notes.length + 1 }
    this.notes.push(note)
    record.latestNoteAt = note.createdAt
    return note
  }

  /**
   * The attachments of a note, oldest first.
   * @param note The note.
   * @returns Its attachments.
   */
  attachmentsOf(note: NoteRecord): readonly AttachmentRecord[] {
    return this.attachments.filter((attachment) => attachment.noteId === note.id)
  }

  /**
   * Looks an attachment up by id, within one note.
   * @param noteId The note's id.
   * @param id The attachment's id.
   * @returns The attachment, or undefined when the note has none by that id.
   */
  findAttachment(noteId: number, id: bigint): AttachmentRecord | undefined {
    return this.attachments.find(
      (attachment) => attachment.noteId === noteId && BigInt(attachment.id) === id,
    )
  }

  /**
   * Looks a case up by id.
   * @param id The id.
   * @returns The case, or undefined when there is none.
   */
  findCase(id: bigint): CaseRecord | undefined {
    return this.cases.find((record) => BigInt(record.id) === id)
  }

  /**
   * Looks a note up by id, within one case.
   * @param caseId The case's id.
   * @param noteId The note's id.
   * @returns The note, or undefined when the case has no note by that id.
   */
  findNote(caseId: bigint, noteId: bigint): NoteRecord | undefined {
    return this.notes.find((note) => BigInt(note.caseId) === caseId && BigInt(note.id) === noteId)
  }
}

function seededTime(minute: number): number {
  return seededAt + minute * 60_000
}

/**
 * Makes a store holding the seeded cases, inserted in the order they were written, each with
 * its notes written by its creator at its own level.
 * @returns The store.
 */
export function seededStore(): CaseStore {
  const store = new CaseStore()
  for (const seeded of seededCases) {
    const creatorId = BigInt(seeded.creatorMemberNo)
    const record = store.addCase({
      aboutPersonId: BigInt(seeded.aboutMemberNo),
      assignedToId: undefined,
      createdAt: seededTime(seeded.minute),
      creatorId,
      extraAccess: [],
      secrecyLevel: seeded.secrecyLevel,
      tags: [],
      title: seeded.title,
      troop: seeded.troop,
      type: seeded.type,
    })
    for (const { minute, note, title } of seeded.notes) {
      store.addNote(record, {
        createdAt: seededTime(minute),
        creatorId,
        note,
        secrecyLevel: seeded.secrecyLevel,
        tags: [],
        title,
      })
    }
    if (seeded.closedMinute !== undefined) {
      record.closed = true
      record.closedAt = seededTime(seeded.closedMinute)
      record.closedById = creatorId
    }
  }
  return store
}

// A datetime as pydantic writes a timezone-aware one in UTC: microseconds only when there are
// any, and Z for the offset.
function timestamp(milliseconds: number | undefined): string | undefined {
  if (milliseconds === undefined) {
    return undefined
  }
  const text = new Date(milliseconds).toISOString()
  return milliseconds % 1000 === 0 ? text.replace(".000Z", "Z") : text.replace("Z", "000Z")
}

/**
 * A case as the service's `Case` model sends it, its keys in the model's order.
 * @param record The case.
 * @returns The object to send.
 */
export function caseJson(record: CaseRecord): Record<string, unknown> {
  return {
    id: record.id,
    created_at: timestamp(record.createdAt),
    creator_id: record.creatorId,
    secrecy_level: record.secrecyLevel,
    title: record.title,
    type: record.type,
    about_person_id: record.aboutPersonId,
    assigned_to_id: record.assignedToId,
    troop: record.troop,
    latest_note_at: timestamp(record.latestNoteAt),
    closed: record.closed,
    closed_at: timestamp(record.closedAt),
    closed_by_id: record.closedById,
    extra_access: record.extraAccess,
    tags: record.tags,
  }
}

/**
 * An attachment as the service's `Attachment` model sends it, its keys in the model's order.
 * @param attachment The attachment.
 * @returns The object to send.
 */
export function attachmentJson(attachment: AttachmentRecord): Record<string, unknown> {
  return {
    id: attachment.id,
    created_at: timestamp(attachment.createdAt),
    creator_id: attachment.creatorId,
    filename: attachment.filename,
    content_type: attachment.contentType,
    width: attachment.width,
    height: attachment.height,
    size: attachment.size,
  }
}

/**
 * A note as the service's `Note` model sends it, its keys in the model's order. A note just
 * written is sent without looking its attachments up, and so with none.
 * @param note The note.
 * @param attachments Its attachments, oldest first.
 * @returns The object to send.
 */
export function noteJson(
  note: NoteRecord,
  attachments: readonly AttachmentRecord[] = [],
): Record<string, unknown> {
  return {
    id: note.id,
    case_id: note.caseId,
    created_at: timestamp(note.createdAt),
    creator_id: note.creatorId,
    secrecy_level: note.secrecyLevel,
    title: note.title,
    note: note.note,
    tags: note.tags,
    attachments: attachments.map((attachment) => attachmentJson(attachment)),
  }
}

/**
 * Orders rows newest first, as `ORDER BY created_at DESC` does. The database leaves a tie in no
 * particular order; the later insert goes first here.
 * @param left One row.
 * @param right The other.
 * @returns Negative when `left` goes first.
 */
export function newestFirst(left: CaseRecord | NoteRecord, right: CaseRecord | NoteRecord): number {
  return right.createdAt - left.createdAt || right.id - left.id
}
