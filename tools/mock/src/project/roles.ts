/**
 * The single definition of a WSJ27 role, as `roles.py` mints them from a participant's fields
 * and the CMT roster: `wsj27:al:<troop>` for a leader, `wsj27:cmt:<funktion>:<roll>` for the
 * contingent management, and `wsj27:access:<level>` for a personal grant.
 */

/**
 * A management member's Funktion and Roll, slugified, keyed by member number.
 */
export type CmtDetails = ReadonlyMap<number, readonly [funktion: string, roll: string]>

/**
 * Lowercases a Swedish label into a role segment: accents folded, and any run of other
 * characters one dash – so "Hälsa" is `halsa` and "FA/CET" is `fa-cet`, and no segment can
 * smuggle in a colon.
 * @param value The label.
 * @returns The segment.
 */
export function slug(value: string): string {
  // NFKD splits an accented letter into the letter and a combining mark, and dropping everything
  // outside ASCII then keeps the letter – what `encode("ascii", "ignore")` keeps.
  const folded = value
    .normalize("NFKD")
    .replaceAll(/[^\u{20}-\u{7E}]/gu, "")
    .toLowerCase()
  return folded
    .split(/[^\da-z]/u)
    .filter((part) => part !== "")
    .join("-")
}

/**
 * Drops a trailing "PL" from a Roll, so "Hälsa PL" mints the same role as "Hälsa". Only a
 * trailing PL set off by whitespace counts – "PL Food house" is a title of its own.
 * @param roll The Roll as the roster writes it.
 * @returns The Roll without the qualifier.
 */
export function dropPlSuffix(roll: string): string {
  const trimmed = roll.trimEnd()
  const isQualified = trimmed.slice(-2).toLowerCase() === "pl" && /\s/u.test(trimmed.slice(-3, -2))
  return isQualified ? trimmed.slice(0, -2).trimEnd() : roll
}

/**
 * Reads the CMT roster – the CSV `CMT_ROLES_FILE` points at – into each member's slugified
 * Funktion and Roll. A row with no member number is someone not yet matched to Scoutnet and is
 * skipped, as is one whose number does not parse or that has no Funktion. The roster holds no
 * quoted fields, so a line splits on its commas.
 * @param csv The roster's text.
 * @returns The details, keyed by member number.
 */
export function loadCmtRoles(csv: string): CmtDetails {
  const text = csv.startsWith("\u{FEFF}") ? csv.slice(1) : csv
  const [header = [], ...rows] = text
    .split(/\r?\n/u)
    .filter((line) => line !== "")
    .map((line) => line.split(","))
  const column = (row: readonly string[], name: string): string =>
    row.at(header.indexOf(name)) ?? ""
  const details = new Map<number, readonly [string, string]>()
  for (const row of rows) {
    const memberNo = column(row, "Medlemsnummer").trim()
    const funktion = slug(column(row, "Funktion"))
    const roll = slug(dropPlSuffix(column(row, "Roll")))
    if (/^[+-]?\d+$/u.test(memberNo) && funktion !== "") {
      details.set(Number(memberNo), [funktion, roll])
    }
  }
  return details
}

/**
 * The fields of a participant that decide their roles.
 */
export interface RoleInputs {
  /**
   * Their Accesstyp, by its option text.
   */
  readonly accessLevel: string
  readonly memberNo: number
  /**
   * Scoutnet's member type – `Avdelningsledare`, `Kontingentledning`, and the rest.
   */
  readonly memberType: string
  readonly troop: string
}

/**
 * Mints one participant's roles. Only leaders and the contingent management get any. A leader
 * gets their troop's role, and none when Scoutnet holds no troop for them; a management member
 * gets their Funktion and Roll from the roster, falling back to plain `wsj27:cmt`. Either then
 * gets their Accesstyp as a role, unless it is "Ingen" or blank.
 * @param inputs The participant's member type, troop, member number, and Accesstyp.
 * @param cmtDetails The roster's Funktion and Roll per member.
 * @returns The roles, in the order the service mints them.
 */
export function rolesForParticipant(inputs: RoleInputs, cmtDetails: CmtDetails): string[] {
  const roles: string[] = []
  const troop = inputs.troop.trim()
  if (inputs.memberType === "Avdelningsledare") {
    if (troop !== "") {
      roles.push(`wsj27:al:${troop}`)
    }
  } else if (inputs.memberType === "Kontingentledning") {
    const [funktion = "", roll = ""] = cmtDetails.get(inputs.memberNo) ?? []
    roles.push(["wsj27:cmt", funktion, roll].filter((segment) => segment !== "").join(":"))
  } else {
    return []
  }
  const accessLevel = inputs.accessLevel.trim()
  if (!["", "ingen"].includes(accessLevel.toLowerCase())) {
    roles.push(`wsj27:access:${accessLevel}`)
  }
  return roles
}
