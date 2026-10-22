import type { Case } from "../../model/Case"
import { isCaseType } from "../../model/CaseType"
import { isSecrecyLevel } from "../../model/SecrecyLevel"
import { isRecord, toDate, toId, toIds } from "./validation"

/**
 * One case as the cases service sends it. Every field is `unknown`, because the service
 * is built separately and changes shape, so the converter decides whether what arrived is
 * usable.
 */
export interface CaseDto {
  readonly about_person_ids?: unknown
  readonly assigned_to_id?: unknown
  readonly closed?: unknown
  readonly closed_at?: unknown
  readonly closed_by_id?: unknown
  readonly created_at?: unknown
  readonly creator_id?: unknown
  readonly extra_access?: unknown
  readonly id?: unknown
  readonly latest_note_at?: unknown
  readonly secrecy_level?: unknown
  readonly tags?: unknown
  readonly title?: unknown
  readonly troop?: unknown
  readonly type?: unknown
}

/**
 * One case as the domain knows it, or undefined when the payload is not one. Undefined
 * rather than a throw, because a list drops the case it cannot read and shows the rest. A
 * type or a level this module does not know makes the case unreadable too, because
 * neither who it reaches nor how to say so could be shown.
 * @param value The case the service sent.
 * @returns The case, or undefined when it is not usable.
 */
export function toCase(value: unknown): Case | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const dto: CaseDto = value

  const id = toId(dto.id)
  const createdAt = toDate(dto.created_at)
  const creatorMemberNo = toId(dto.creator_id)
  if (
    id === undefined ||
    createdAt === undefined ||
    creatorMemberNo === undefined ||
    typeof dto.title !== "string" ||
    !isCaseType(dto.type) ||
    !isSecrecyLevel(dto.secrecy_level)
  ) {
    return undefined
  }

  const assigneeMemberNo = toId(dto.assigned_to_id)
  const closedAt = toDate(dto.closed_at)
  const closedByMemberNo = toId(dto.closed_by_id)
  const latestNoteAt = toDate(dto.latest_note_at)

  return {
    aboutMemberNos: toIds(dto.about_person_ids),
    ...(assigneeMemberNo !== undefined && { assigneeMemberNo }),
    ...(closedAt !== undefined && { closedAt }),
    ...(closedByMemberNo !== undefined && { closedByMemberNo }),
    createdAt,
    creatorMemberNo,
    extraAccess: toIds(dto.extra_access),
    id,
    isClosed: dto.closed === true,
    ...(latestNoteAt !== undefined && { latestNoteAt }),
    secrecyLevel: dto.secrecy_level,
    title: dto.title,
    troop: typeof dto.troop === "string" ? dto.troop : "",
    type: dto.type,
  }
}

/**
 * Every readable case of a list payload, in the order the service sent them – newest
 * first.
 * @param value The body the cases service answered with.
 * @returns The cases, with the unreadable ones dropped.
 */
export function toCases(value: unknown): readonly Case[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map((row: unknown) => toCase(row)).filter((row): row is Case => row !== undefined)
}
