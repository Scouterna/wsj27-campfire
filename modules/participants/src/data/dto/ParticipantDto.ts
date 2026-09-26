import type { Participant } from "../../model/Participant"
import type { ParticipantRole } from "../../model/ParticipantRole"
import type { CmtFunktion } from "../../model/Participation"
import { answer, flattenAnswers } from "./answers"
import { toContactEmails, toCurrent } from "./contact"

/**
 * One participant as the participants service sends them – the basic block a listing row
 * carries and every detail answer starts from.
 *
 * Every DTO field is `unknown`, because the service is built separately and changes shape,
 * so a DTO says which keys to expect and its converter decides whether what arrived is
 * usable. A field declared `string` would be a promise this module cannot keep, and would
 * turn a bad payload into a crash far from the boundary.
 */
export interface ParticipantDto {
  readonly member_no?: unknown
  readonly name?: unknown
  readonly born?: unknown
  readonly sex?: unknown
  readonly member_group?: unknown
  readonly email?: unknown
  readonly mobile?: unknown
  readonly member_type?: unknown
  readonly access_level?: unknown
  readonly troop?: unknown
  readonly roles?: unknown
  /**
   * The contact answers, which the service sends with a listing as well as with a person
   * – and leaves out of a leader's row for a caller who may not read a leader's own.
   */
  readonly contact_info?: unknown
}

// Scoutnet's member types, mapped to the domain's roles. A type invented by a later
// version of the service must not reach the domain as a valid one – the screens switch on
// the role exhaustively.
const rolesByMemberType = new Map<string, ParticipantRole>([
  ["Deltagare", "deltagare"],
  ["IST", "ist"],
  ["Avdelningsledare", "ledare"],
  ["Kontingentledning", "kontingentledning"],
])

// The funktion segment a `wsj27:cmt:<funktion>:<roll>` role names, mapped to the
// domain's. The support function is split by its roll, because "support" alone places
// nobody. A segment a later roster invents maps to nothing rather than a guess.
const funktionsBySegment: ReadonlyMap<string, CmtFunktion> = new Map([
  ["admin", "administration"],
  ["hoc", "kontingentledare"],
  ["kommunikation", "kommunikation"],
  ["program", "program"],
])

const funktionsBySupportRoll: ReadonlyMap<string, CmtFunktion> = new Map([
  ["avdelningssupport", "avdelningssupport"],
  ["halsa", "halsosupport"],
  ["ist-support", "istSupport"],
])

// The roster's FA roll – funktionsansvarig – as the service slugifies it: "FA" plain,
// and "FA/CET" for the ones who are also in the core event team.
const faRolls = new Set(["fa", "fa-cet"])

/**
 * What the minted roles say about a management member: the funktion they serve in, and
 * whether they are its funktionsansvarig. Both absent for everyone outside the
 * contingent management, and for a member whose roles name no funktion.
 * @param roles The record's `roles` field, as the service sent it.
 * @returns The funktion and the FA mark, each present only where the roles say so.
 */
function toCmtDetail(roles: unknown): Pick<Participant, "funktion" | "isFunktionsansvarig"> {
  if (!Array.isArray(roles)) {
    return {}
  }
  for (const role of roles) {
    if (typeof role !== "string") {
      continue
    }
    const segments = role.split(":")
    if (segments[0] !== "wsj27" || segments[1] !== "cmt") {
      continue
    }
    const funktion =
      segments[2] === "support"
        ? funktionsBySupportRoll.get(segments[3] ?? "")
        : funktionsBySegment.get(segments[2] ?? "")
    if (funktion !== undefined) {
      return {
        funktion,
        ...(faRolls.has(segments[3] ?? "") && { isFunktionsansvarig: true }),
      }
    }
  }
  return {}
}

/**
 * The addresses the list mails and copies – a person's own, and those of everybody the
 * registration names around them – read from the contact answers the service sends with a
 * listing row.
 * @param dto The row the participants service sent.
 * @returns The addresses, each present only where there is one.
 */
function toAddresses(
  dto: ParticipantDto,
): Pick<Participant, "alternateEmail" | "contactEmails" | "email"> {
  const answers = flattenAnswers(dto.contact_info, undefined)
  const email = toCurrent(dto.email, answers, "email")
  const alternateEmail = answer(answers, "alternateEmail")
  const contactEmails = toContactEmails(answers)
  return {
    ...(email !== undefined && { email }),
    ...(alternateEmail !== undefined && { alternateEmail }),
    ...(Object.keys(contactEmails).length > 0 && { contactEmails }),
  }
}

/**
 * The member number as this module carries it: a string, because it is an identifier –
 * routes, caches, and links hold it, and nothing does arithmetic on it. The service is not
 * consistent about the wire type, so both spellings are accepted.
 * @param value The untyped value the member number arrived in.
 * @returns The member number, or undefined when it is not a usable one.
 */
function toMemberNo(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value)
  }
  if (typeof value === "string" && value !== "") {
    return value
  }
  return undefined
}

/**
 * The two name halves the service's one name string holds. The last word is read as the
 * family name – right for the overwhelmingly common Swedish shape, and where a family
 * name has several words the whole name still displays correctly, since every screen
 * shows the two halves joined.
 * @param value The untyped value the name arrived in.
 * @returns The halves, or undefined when the name is not a usable one.
 */
function toName(value: unknown): { firstName: string; lastName: string } | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined
  }
  const parts = value.trim().split(/\s+/u)
  const lastName = parts.length > 1 ? (parts.at(-1) ?? "") : ""
  const firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : (parts[0] ?? "")
  return { firstName, lastName }
}

/**
 * One listing row as the domain knows it, or undefined when the payload is not one.
 * Undefined rather than a throw because a list drops the row it cannot read and shows the
 * rest – one broken record must not empty the list somebody is standing in a field trying
 * to read.
 * @param dto The row the participants service sent.
 * @returns The person, or undefined when the row is not usable.
 */
export function toParticipant(dto: ParticipantDto): Participant | undefined {
  // The member number is the identity – a row without one cannot be linked to.
  const memberNo = toMemberNo(dto.member_no)
  if (memberNo === undefined) {
    return undefined
  }

  const name = toName(dto.name)
  if (name === undefined) {
    return undefined
  }

  const role =
    typeof dto.member_type === "string" ? rolesByMemberType.get(dto.member_type) : undefined
  if (role === undefined) {
    return undefined
  }

  // The troop is a string upstream and empty for anyone who has none – the contingent
  // management, and the IST, whose patrols the participants service does not carry. So a
  // unit number here is always a unit, never anything else.
  const unitNumber =
    typeof dto.troop === "string" && /^\d+$/u.test(dto.troop) ? Number(dto.troop) : undefined

  // The birth date rides along only when it is the ISO date the service documents –
  // anything else is absence, never a guess.
  const birthDate =
    typeof dto.born === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(dto.born) ? dto.born : undefined

  // The scoutkår at home. The service sends the empty string for nobody's, which is
  // absence rather than a kår with no name.
  const memberGroup =
    typeof dto.member_group === "string" && dto.member_group.trim() !== ""
      ? dto.member_group.trim()
      : undefined

  const cmtDetail = toCmtDetail(dto.roles)

  return {
    memberNo,
    ...name,
    role,
    // Spread rather than assigned, because an absent unit is a missing key, not a key
    // holding undefined, which is the distinction `exactOptionalPropertyTypes` holds the
    // code to.
    ...(unitNumber !== undefined && { unitNumber }),
    ...(birthDate !== undefined && { birthDate }),
    ...(memberGroup !== undefined && { memberGroup }),
    ...toAddresses(dto),
    ...cmtDetail,
  }
}

/**
 * Every readable row of a listing payload, in the order it arrived. The listing endpoint
 * answers a bare array, not an envelope.
 * @param value The body the participants service answered with.
 * @returns The people the payload holds, with the unreadable rows dropped.
 */
export function toParticipants(value: unknown): readonly Participant[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .map((row: ParticipantDto) => toParticipant(row))
    .filter((row): row is Participant => row !== undefined)
}
