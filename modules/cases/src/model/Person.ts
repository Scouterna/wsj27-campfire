/**
 * What somebody is in the contingent, from the closed set the list of participants
 * places people in.
 */
export type PersonRole = "deltagare" | "ist" | "kontingentledning" | "ledare"

/**
 * Somebody in the contingent as the cases module names them – enough to say who a case is
 * about and who wrote a note.
 */
export interface Person {
  /**
   * The Scoutnet member number, which cases and notes name people by.
   */
  readonly memberNo: string
  /**
   * The whole name, as the list of participants spells it.
   */
  readonly name: string
  /**
   * What they are in the contingent, absent when the list of participants says
   * something this module does not know.
   */
  readonly role?: PersonRole
  /**
   * The unit number, absent for the IST and the contingent management.
   */
  readonly troop?: string
}

/**
 * Everyone in the contingent, keyed by member number.
 */
export type People = ReadonlyMap<string, Person>

/**
 * What to call somebody a case or a note names by member number.
 * @param people Everyone the module knows, undefined while they are still loading.
 * @param memberNo The member number to name.
 * @returns The person's name, or "Medlem" and the number for somebody the list of
 * participants does not hold, so a row always names somebody.
 */
export function nameOf(people: People | undefined, memberNo: string): string {
  return people?.get(memberNo)?.name ?? `Medlem ${memberNo}`
}

/**
 * The words for a role, as the rest of the product writes them.
 */
const roleNames: ReadonlyMap<PersonRole, string> = new Map([
  ["deltagare", "Deltagare"],
  ["ist", "IST"],
  ["kontingentledning", "CMT"],
  ["ledare", "Ledare"],
])

/**
 * The line under a person's name in full – their role, then their unit by number and
 * name – such as "Deltagare · Avdelning 1 · Ankan".
 * @param person The person to place.
 * @param unitName What a unit is called, from the unit identities.
 * @returns The line, or undefined for somebody the module knows nothing about.
 */
export function placingLine(
  person: Person | undefined,
  unitName: (unitNumber: number) => string | undefined,
): string | undefined {
  const role = person?.role === undefined ? undefined : roleNames.get(person.role)
  const unit = unitNumberOf(person)
  if (unit === undefined) {
    return role
  }
  const name = unitName(unit)
  const unitWords =
    name === undefined ? `Avdelning ${String(unit)}` : `Avdelning ${String(unit)} · ${name}`
  return role === undefined ? unitWords : `${role} · ${unitWords}`
}

/**
 * The unit a person belongs to. Only a troop of digits names one, because the IST and
 * the management are troops to the list of participants and no unit to Campfire.
 * @param person The person to place.
 * @returns The unit number, or undefined.
 */
export function unitNumberOf(person: Person | undefined): number | undefined {
  const troop = person?.troop
  return troop !== undefined && /^\d+$/u.test(troop) ? Number(troop) : undefined
}

/**
 * The short tag a list row puts after a name – "Avd 7" – so the unit reads at a glance.
 * @param person The person to place.
 * @returns The tag, or undefined for somebody without a unit.
 */
export function unitTag(person: Person | undefined): string | undefined {
  const unit = unitNumberOf(person)
  return unit === undefined ? undefined : `Avd ${String(unit)}`
}
