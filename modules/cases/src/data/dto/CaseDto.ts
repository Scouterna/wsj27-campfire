import type { Case } from "../../model/Case"
import { isRecord, toDate, toId } from "./validation"

/**
 * One case as the cases service sends it. Every field is `unknown`, because the service
 * is built separately and changes shape, so the converter decides whether what arrived is
 * usable.
 */
export interface CaseDto {
  readonly about_person_id?: unknown
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
 * rather than a throw, because a list drops the case it cannot read and shows the rest.
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
    typeof dto.title !== "string"
  ) {
    return undefined
  }

  const aboutMemberNo = toId(dto.about_person_id)
  const closedAt = toDate(dto.closed_at)
  const closedByMemberNo = toId(dto.closed_by_id)
  const latestNoteAt = toDate(dto.latest_note_at)

  return {
    ...(aboutMemberNo !== undefined && { aboutMemberNo }),
    ...(closedAt !== undefined && { closedAt }),
    ...(closedByMemberNo !== undefined && { closedByMemberNo }),
    createdAt,
    creatorMemberNo,
    id,
    isClosed: dto.closed === true,
    ...(latestNoteAt !== undefined && { latestNoteAt }),
    title: dto.title,
    troop: typeof dto.troop === "string" ? dto.troop : "",
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
