import type { Role, Unit } from "@scouterna/wsj27-campfire-utils"

/**
 * Somebody the signed-in person may be shown Campfire as – a leader or a member of the
 * contingent management, because the auth service impersonates only members who hold
 * roles.
 */
export interface ImpersonationTarget {
  /**
   * The given name, the first word of the full name, which the confirmation is worded
   * with.
   */
  readonly firstName: string
  /**
   * The Scoutnet member number the auth service is asked to become.
   */
  readonly memberNo: string
  /**
   * The full name, as the list of participants spells it.
   */
  readonly name: string
  /**
   * The roles the person holds, which the session will hold while it is theirs.
   */
  readonly roles: readonly Role[]
  /**
   * The unit a leader leads, from the roles first and the list of participants second.
   */
  readonly unit?: Unit
}

/**
 * Whether a person's name holds what the reader typed.
 * @param target The person to test.
 * @param query What the reader typed. Surrounding spaces and case are ignored, and an
 * empty search matches everybody.
 * @returns True when the name holds the search text.
 */
export function isMatch(target: ImpersonationTarget, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase("sv")
  return needle === "" || target.name.toLocaleLowerCase("sv").includes(needle)
}
