import { fetch } from "@scouterna/wsj27-campfire-utils"

import type { Attachment } from "../model/Attachment"
import type { Case } from "../model/Case"
import type { CaseScope } from "../model/CaseType"
import type { Note } from "../model/Note"
import type { Person } from "../model/Person"
import { defaultSecrecyLevel, type SecrecyLevel } from "../model/SecrecyLevel"
import { attachmentsUrl, caseUrl } from "./case-urls"
import { toAttachment } from "./dto/AttachmentDto"
import { toCase } from "./dto/CaseDto"
import { toNote } from "./dto/NoteDto"

/**
 * Writes a note on an open case. A closed case refuses it with a 409.
 * @param caseId The case to write on.
 * @param text What the note says.
 * @param title The note's heading.
 * @param level A level above the case's own, for a note some who reach the case should not
 * read. Left out, the note takes its case's level, which the service fills in. Below the
 * case's, the service refuses it with a 422, and at 4 from someone the case is only shared
 * with, with a 403.
 * @returns The note as the service stored it.
 */
export async function addNote(
  caseId: string,
  text: string,
  title: string,
  level?: SecrecyLevel,
): Promise<Note> {
  const url = `${caseUrl(caseId)}/notes`
  const body = { note: text, ...(level !== undefined && { secrecy_level: level }), title }
  return read(toNote(await fetch<unknown>(url, { body, method: "POST" })), url)
}

/**
 * Makes someone responsible for following an open case up, or nobody. Anyone who can open
 * the case may, and only someone who can open it may be made responsible, or the service
 * refuses with a 422 – a closed case with a 409.
 * @param caseId The case.
 * @param memberNo Who is to be responsible, or undefined for nobody.
 * @returns The case with its new assignee.
 */
export async function assignCase(caseId: string, memberNo: string | undefined): Promise<Case> {
  const url = `${caseUrl(caseId)}/assignee`
  // The service clears the assignee on a JSON null, which is what an absent one is on the
  // wire.
  // eslint-disable-next-line unicorn/no-null -- the service's own shape for nobody
  const body = { assigned_to_id: memberNo === undefined ? null : Number(memberNo) }
  return read(toCase(await fetch<unknown>(url, { body, method: "PUT" })), url)
}

/**
 * Attaches a picture to a note the caller wrote, on an open case. The service stores it
 * as a JPEG of at most 2048 pixels either way, without its EXIF. It refuses with a 403 for
 * a note someone else wrote, a 409 for a closed case or a note that already has ten
 * pictures, a 413 for more than 20 MB, and a 422 for anything but a JPEG, PNG, or WebP
 * picture.
 * @param caseId The case the note is on.
 * @param noteId The note.
 * @param picture The picture, under the file name the service keeps with it.
 * @returns The picture as the service stored it.
 */
export async function attachPicture(
  caseId: string,
  noteId: string,
  picture: File,
): Promise<Attachment> {
  const url = attachmentsUrl(caseId, noteId)
  const form = new FormData()
  form.set("file", picture, picture.name)
  return read(
    toAttachment(await fetch<unknown>(url, { body: form, method: "POST" }), caseId, noteId),
    url,
  )
}

/**
 * Closes a case. One already closed is refused with a 409.
 * @param caseId The case to close.
 * @returns The case as it stands closed.
 */
export async function closeCase(caseId: string): Promise<Case> {
  const url = `${caseUrl(caseId)}/close`
  return read(toCase(await fetch<unknown>(url, { method: "POST" })), url)
}

/**
 * A case about one person, under a title, in the scope and at the level its creator chose.
 */
export interface NewCase {
  /**
   * How far the case reaches beyond its creator.
   */
  readonly level: SecrecyLevel
  /**
   * Who the case is about. For a unit's case, someone in that unit, or the service
   * refuses it with a 422.
   */
  readonly person: Person
  /**
   * The type, and for a unit's case the unit, which must be one the caller's roles give,
   * or the service refuses it with a 403.
   */
  readonly scope: CaseScope
  /**
   * What the case is about, in a line.
   */
  readonly title: string
}

/**
 * Opens a case about a person. It opens without a note, so a case can be opened the
 * moment it is needed and written on as things happen. The level is sent only when it is
 * not the service's own default, which the service asks of its clients.
 * @param input Who the case is about, its title, its scope, and its level.
 * @returns The case as the service opened it.
 */
export async function createCase(input: NewCase): Promise<Case> {
  const created = await fetch<unknown>("/api/project/cases", {
    body: {
      about_person_id: Number(input.person.memberNo),
      ...(input.level !== defaultSecrecyLevel && { secrecy_level: input.level }),
      title: input.title,
      // A unit's case is kept for its unit, and any other is filed under its person's.
      troop:
        input.scope.unitNumber === undefined
          ? (input.person.troop ?? "")
          : String(input.scope.unitNumber),
      type: input.scope.type,
    },
    method: "POST",
  })
  return read(toCase(created), "/api/project/cases")
}

/**
 * Renames an open case. A closed one is refused with a 409, and a blank title with a 422.
 * @param caseId The case to rename.
 * @param title The new title.
 * @returns The case under its new title.
 */
export async function renameCase(caseId: string, title: string): Promise<Case> {
  const url = `${caseUrl(caseId)}/title`
  return read(toCase(await fetch<unknown>(url, { body: { title }, method: "PUT" })), url)
}

/**
 * Shares a case with exactly these people, replacing whoever it was shared with before –
 * the service replaces the list rather than merging into it, so the whole list is sent.
 * Only the type's own role holders may, and on a private case only its creator, or the
 * service refuses with a 403. A level 4 case refuses anyone with a 422, and a closed one
 * with a 409.
 * @param caseId The case to share.
 * @param memberNos Everyone it is to be shared with, by member number.
 * @returns The case as it is now shared.
 */
export async function shareCase(caseId: string, memberNos: readonly string[]): Promise<Case> {
  const url = `${caseUrl(caseId)}/extra_access`
  const body = { extra_access: memberNos.map(Number) }
  return read(toCase(await fetch<unknown>(url, { body, method: "PUT" })), url)
}

/**
 * Reopens a closed case. One that is open is refused with a 409.
 * @param caseId The case to reopen.
 * @returns The case as it stands open again.
 */
export async function reopenCase(caseId: string): Promise<Case> {
  const url = `${caseUrl(caseId)}/reopen`
  return read(toCase(await fetch<unknown>(url, { method: "POST" })), url)
}

/**
 * What a write answered with, or a throw naming the address when the answer could not be
 * read – the write went through, but there is nothing to show for it.
 * @param converted The converted answer, undefined when it did not convert.
 * @param url The address that answered.
 * @returns The converted answer.
 */
function read<T>(converted: T | undefined, url: string): T {
  if (converted === undefined) {
    throw new Error(`${url} answered with something that is not readable`)
  }
  return converted
}
