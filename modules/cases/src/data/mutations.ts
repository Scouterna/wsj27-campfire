import { fetch } from "@scouterna/wsj27-campfire-utils"

import type { Case } from "../model/Case"
import type { Note } from "../model/Note"
import type { Person } from "../model/Person"
import { toCase } from "./dto/CaseDto"
import { toNote } from "./dto/NoteDto"

/**
 * The cases service's secrecy level for everything the health team writes – the highest,
 * because what it writes about somebody's health is the most sensitive thing the service
 * holds. A note may not be less secret than its case, so the two always match.
 */
const secrecyLevel = 5

/**
 * Writes a note on an open case. A closed case refuses it with a 409.
 * @param caseId The case to write on.
 * @param text What the note says.
 * @param title The note's heading.
 * @returns The note as the service stored it.
 */
export async function addNote(caseId: string, text: string, title: string): Promise<Note> {
  const url = `${caseUrl(caseId)}/notes`
  return read(
    toNote(
      await fetch<unknown>(url, {
        body: { note: text, secrecy_level: secrecyLevel, title },
        method: "POST",
      }),
    ),
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
 * What the health team opens: a case about one person, under a title.
 */
export interface NewCase {
  /**
   * Who the case is about.
   */
  readonly person: Person
  /**
   * What the case is about, in a line.
   */
  readonly title: string
}

/**
 * Opens a health case about a person. It opens without a note, so a case can be opened
 * the moment it is needed and written on as things happen.
 * @param input Who the case is about, and its title.
 * @returns The case as the service opened it.
 */
export async function createCase(input: NewCase): Promise<Case> {
  const created = await fetch<unknown>("/api/project/cases", {
    body: {
      about_person_id: Number(input.person.memberNo),
      secrecy_level: secrecyLevel,
      title: input.title,
      troop: input.person.troop ?? "",
      type: "hälsa",
    },
    method: "POST",
  })
  return read(toCase(created), "/api/project/cases")
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
 * Where one case answers.
 * @param caseId The case, encoded because the identifier arrives from the address bar
 * and a reserved character must not rewrite the path.
 * @returns The case's address.
 */
function caseUrl(caseId: string): string {
  return `/api/project/cases/${encodeURIComponent(caseId)}`
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
