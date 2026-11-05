/**
 * The single definition of a WSJ27 role, as `roles.py` mints them from a participant's fields:
 * `wsj27:al:<troop>` for a leader, `wsj27:cmt:<funktion>:<roll>` for the contingent management,
 * and `wsj27:legacy-access:<level>` for a personal grant from the form.
 */

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
 * @param roll The Roll as the answer writes it.
 * @returns The Roll without the qualifier.
 */
export function dropPlSuffix(roll: string): string {
  const trimmed = roll.trimEnd()
  const isQualified = trimmed.slice(-2).toLowerCase() === "pl" && /\s/u.test(trimmed.slice(-3, -2))
  return isQualified ? trimmed.slice(0, -2).trimEnd() : roll
}

/**
 * The management role for one member's "<Funktion> | <Roll>" answer, as specific as it allows –
 * falling back through `wsj27:cmt:<funktion>` to plain `wsj27:cmt` rather than granting nothing,
 * so a member whose answer is still empty gets what every management member has. The answer is
 * written by hand, so the spacing around the "|" counts for nothing, and the separator is "|"
 * because a Roll can hold a "/".
 * @param answer The member's answer, empty where there is none.
 * @returns The role.
 */
export function cmtRole(answer: string): string {
  const separator = answer.indexOf("|")
  const funktion = slug(separator === -1 ? answer : answer.slice(0, separator))
  if (funktion === "") {
    return "wsj27:cmt"
  }
  const roll = separator === -1 ? "" : slug(dropPlSuffix(answer.slice(separator + 1).trim()))
  return roll === "" ? `wsj27:cmt:${funktion}` : `wsj27:cmt:${funktion}:${roll}`
}

/**
 * The fields of a participant that decide their roles.
 */
export interface RoleInputs {
  /**
   * Their Accesstyp, by its option text.
   */
  readonly accessLevel: string
  /**
   * A management member's "<Funktion> | <Roll>" answer, empty where there is none.
   */
  readonly cmtRole: string
  /**
   * Scoutnet's member type – `Avdelningsledare`, `Kontingentledning`, and the rest.
   */
  readonly memberType: string
  readonly troop: string
}

/**
 * Mints one participant's roles. Only leaders and the contingent management get any. A leader
 * gets their troop's role, and none when Scoutnet holds no troop for them; a management member
 * gets their Funktion and Roll from their answer. Either then gets their Accesstyp as a role,
 * unless it is "Ingen" or blank.
 * @param inputs The participant's member type, troop, management answer, and Accesstyp.
 * @returns The roles, in the order the service mints them.
 */
export function rolesForParticipant(inputs: RoleInputs): string[] {
  const roles: string[] = []
  const troop = inputs.troop.trim()
  if (inputs.memberType === "Avdelningsledare") {
    if (troop !== "") {
      roles.push(`wsj27:al:${troop}`)
    }
  } else if (inputs.memberType === "Kontingentledning") {
    roles.push(cmtRole(inputs.cmtRole))
  } else {
    return []
  }
  const accessLevel = inputs.accessLevel.trim()
  if (!["", "ingen"].includes(accessLevel.toLowerCase())) {
    roles.push(`wsj27:legacy-access:${accessLevel}`)
  }
  return roles
}
