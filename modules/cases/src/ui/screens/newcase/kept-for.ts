import { canBeAbout, type CaseScope } from "../../../model/CaseType"
import type { AboutChoice } from "./AboutQuestion"

/**
 * What a new case is about, with whatever its scope cannot be about set aside.
 * @param given What the reader chose, or the address named.
 * @param scope The case's scope, undefined while none is chosen.
 * @returns What the case would be about – everything given while no scope is chosen, and
 * no one at all in place of a unit other than a unit's case's own.
 */
export function keptFor(given: AboutChoice, scope: CaseScope | undefined): AboutChoice {
  if (scope === undefined) {
    return given
  }
  if (given.kind === "people") {
    return { kind: "people", people: given.people.filter((person) => canBeAbout(scope, person)) }
  }
  return scope.unitNumber === undefined || scope.unitNumber === given.unitNumber
    ? given
    : { kind: "people", people: [] }
}
