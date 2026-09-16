import type { Role } from "@scouterna/wsj27-campfire-utils"

import type { Unit } from "./Unit"

/**
 * The signed-in person, as the application knows them – our definition, not the
 * provider's: the decode reads whatever ScoutID spells and answers with these four
 * facts, so nothing downstream ever meets a provider field. There is no second
 * definition of who is signed in.
 */
export interface User {
  /**
   * What to greet them by – derived once, at the decode, from whatever name parts the
   * provider sent.
   */
  readonly firstName: string
  /**
   * The Scoutnet member number – what the list of participants and the roles are keyed by.
   */
  readonly memberNo: string
  /**
   * The full name, for wherever a greeting is too little.
   */
  readonly name: string
  /**
   * The roles the application knows, translated once from the provider's flattened
   * spellings.
   */
  readonly roles: readonly Role[]
  /**
   * The unit the roles or the list of participants place them in, where either does –
   * a leader's comes from their role, anyone else's from the list, and plenty of people
   * simply have none.
   */
  readonly unit?: Unit
}
