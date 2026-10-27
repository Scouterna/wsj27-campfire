import { hasRole, roleSuffixes } from "./authentication.ts"
import type { CaseRecord, NoteRecord } from "./case-store.ts"
import type { ParticipantsList } from "./participants-list.ts"

/**
 * Who reaches a case in the cases service, as `case.py` decides it. A case's type names the
 * role it needs, and an `avdelning` case is also limited to the leaders of its own troop. Its
 * secrecy level decides the rest:
 *
 * - 3 – its role holders, and its grantees, the members on its `extra_access`
 * - 4 – its role holders only, and the case cannot have `extra_access`
 * - 5 – its creator, while still holding the role, and its grantees
 *
 * A grantee may do what a role holder may, except change `extra_access` or write a level 4
 * note. A note's own level matters only above its case's: a level 4 note is for role holders
 * alone, and a level 5 note for its author alone.
 */

/**
 * Someone a rule is asked about – the caller, or a participant who might be given the case.
 */
export interface Person {
  readonly roles: readonly string[]
  /**
   * Their member number. The caller's comes from their token and can fail to be a number, so it
   * is read only where a rule needs it, as the service reads it.
   */
  readonly userId: () => bigint
}

/**
 * The case types, each with the role a caller needs for it, in declaration order – the order
 * `/cases/types` lists them in.
 */
export const caseTypes: ReadonlyMap<string, string> = new Map([
  ["hälsa", "wsj27:cmt:support:halsa"],
  ["cmt", "wsj27:cmt"],
  ["avdelning", "wsj27:al"],
])

/**
 * The types a person may create cases of. With none, all of `/cases` is closed to them, and a
 * bare `wsj27:al` gives no `avdelning`, because it names no troop.
 * @param person The person whose roles to read.
 * @returns The types, in declaration order.
 */
export function typesFor(person: Person): readonly string[] {
  return [...caseTypes]
    .filter(
      ([type, role]) =>
        hasRole(person.roles, role) &&
        (type !== "avdelning" || roleSuffixes(person.roles, "wsj27:al").size > 0),
    )
    .map(([type]) => type)
}

/**
 * Whether a person holds the role a case of this type, for this troop, needs.
 * @param person The person whose roles to read.
 * @param type The case's type, which may be one the service does not know.
 * @param troop The case's troop.
 * @returns Whether they hold it.
 */
export function hasCaseRole(person: Person, type: string, troop: string): boolean {
  if (type === "avdelning") {
    return hasRole(person.roles, `wsj27:al:${troop}`)
  }
  const role = caseTypes.get(type)
  return role !== undefined && hasRole(person.roles, role)
}

/**
 * Whether a person holds the role the case needs. On a level 5 case only its creator counts.
 * @param person The person whose roles to read.
 * @param record The case whose role they must hold.
 * @returns Whether they are one of its role holders.
 */
export function isRoleHolder(person: Person, record: CaseRecord): boolean {
  if (record.secrecyLevel === 5 && record.creatorId !== person.userId()) {
    return false
  }
  return hasCaseRole(person, record.type, record.troop)
}

// On the case's extra_access. A level 4 case has no grantees, even if one slipped in.
function isGrantee(person: Person, record: CaseRecord): boolean {
  return record.secrecyLevel !== 4 && record.extraAccess.includes(person.userId())
}

/**
 * Whether a person reaches a case. One who does not is answered as if it did not exist.
 * @param person The person asking.
 * @param record The case asked for.
 * @returns Whether they reach it.
 */
export function canReach(person: Person, record: CaseRecord): boolean {
  return isRoleHolder(person, record) || isGrantee(person, record)
}

/**
 * Whether someone who reaches a case may read one of its notes.
 * @param person The person, who reaches the case.
 * @param record The case the note is on.
 * @param note The note asked for.
 * @returns Whether they may read it.
 */
export function canReadNote(person: Person, record: CaseRecord, note: NoteRecord): boolean {
  if (note.secrecyLevel <= record.secrecyLevel) {
    return true
  }
  if (note.secrecyLevel === 4) {
    return isRoleHolder(person, record)
  }
  return note.creatorId === person.userId()
}

/**
 * The participants who can open a case – those with some case type at all who reach it – and so
 * the members it can be assigned to. Their roles come from the list of participants rather than
 * a token, so someone missing from the list is never among them.
 * @param participantsList The list of participants.
 * @param record The case to be opened.
 * @returns Their member numbers, ascending.
 */
export function membersWithAccess(
  participantsList: ParticipantsList,
  record: CaseRecord,
): readonly bigint[] {
  return participantsList
    .values()
    .map((participant) => {
      const userId = BigInt(participant.member_no)
      return { roles: participant.roles, userId: () => userId }
    })
    .filter((person) => typesFor(person).length > 0 && canReach(person, record))
    .map((person) => person.userId())
    .toArray()
    .toSorted((left, right) => Number(left - right))
}
