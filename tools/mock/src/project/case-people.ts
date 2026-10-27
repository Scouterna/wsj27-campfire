import type { Context } from "hono"

import { answer, detail } from "../pydantic.ts"
import { isRoleHolder, type Person } from "./case-access.ts"
import { storable, type Service } from "./case-dependencies.ts"
import { caseJson, type CaseRecord } from "./case-store.ts"

/**
 * Who a case is about, as `case.py` keeps it: the troop rule for those added to a unit's
 * case, and the words of the note that records a change.
 */

// The participants dictionary is keyed by member number, so a number past what it can hold is
// simply nobody.
function participantOf(
  { participantsList }: Service,
  memberNo: bigint,
): { readonly troop: string } | undefined {
  return memberNo <= BigInt(Number.MAX_SAFE_INTEGER) && memberNo >= 0n
    ? participantsList.get(Number(memberNo))
    : undefined
}

/**
 * `_check_in_troop`: an `avdelning` case can only be about members of its own troop, and the
 * first who is not is refused – the same answer for someone missing and someone in another
 * troop, so a leader cannot use it to find out who is in the contingent.
 * @param service The list of participants.
 * @param context The request being answered.
 * @param kind The case's type and troop.
 * @param memberIds Who it would be about.
 * @returns The refusal, or undefined when everyone is in the troop.
 */
export function refuseOutsideTroop(
  service: Service,
  context: Context,
  kind: readonly [type: string, troop: string],
  memberIds: readonly bigint[],
): Response | undefined {
  const [type, troop] = kind
  if (type !== "avdelning") {
    return undefined
  }
  const outside = memberIds.find((memberId) => participantOf(service, memberId)?.troop !== troop)
  return outside === undefined
    ? undefined
    : detail(context, `Member ${String(outside)} is not in troop ${troop}`, 422)
}

/**
 * `_about_change_note`: who was added and who removed, by member number, a line each.
 * @param added Who was added.
 * @param removed Who was removed.
 * @returns The note's text.
 */
export function aboutChange(added: readonly bigint[], removed: readonly bigint[]): string {
  const lines: readonly (readonly [string, readonly bigint[]])[] = [
    ["Added", added],
    ["Removed", removed],
  ]
  return lines
    .filter(([, ids]) => ids.length > 0)
    .map(([label, ids]) => `${label}: ${ids.map(String).join(", ")}`)
    .join("\n")
}

/**
 * `PUT /cases/{case_id}/about_person_ids`, once its case is solved and its body is valid:
 * the whole list replaced by the case type's role holders, and a note at the case's level
 * saying who was added and who removed. The same people again change nothing.
 * @param service The store, the clock, and the list of participants.
 * @param context The request being answered.
 * @param caller The caller, who must hold the type's role.
 * @param change The case, and who it is to be about.
 * @returns The case as it stands, or the service's refusal.
 */
export function replacePeople(
  service: Service,
  context: Context,
  caller: Person,
  change: readonly [record: CaseRecord, aboutPersonIds: readonly bigint[]],
): Response {
  const [record, aboutPersonIds] = change
  if (!isRoleHolder(caller, record)) {
    return detail(context, "Only the case type's own roles may do this", 403)
  }
  const added = aboutPersonIds.filter((id) => !record.aboutPersonIds.includes(id))
  const removed = record.aboutPersonIds.filter((id) => !aboutPersonIds.includes(id))
  if (added.length === 0 && removed.length === 0) {
    return answer(context, caseJson(record))
  }
  // Only those added, so someone already on the case who has since moved troop can stay.
  const outside = refuseOutsideTroop(service, context, [record.type, record.troop], added)
  if (outside !== undefined) {
    return outside
  }
  const creatorId = caller.userId()
  storable(aboutPersonIds, creatorId)
  // The note and the new list are one transaction in the service, so the case's latest
  // note moves with them.
  service.store.addNote(record, {
    createdAt: service.now(),
    creatorId,
    note: aboutChange(added, removed),
    secrecyLevel: record.secrecyLevel,
    tags: [],
    title: "Changed who the case is about",
  })
  record.aboutPersonIds = aboutPersonIds
  return answer(context, caseJson(record))
}
