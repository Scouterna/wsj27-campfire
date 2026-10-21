import { unitNumberOf, type Person } from "./Person"

/**
 * What a case is kept for, which decides whose role reaches it: the health team's, the
 * contingent management's, or one unit's leaders'.
 */
export type CaseType = "avdelning" | "cmt" | "hälsa"

/**
 * Every type, in the order a form offers them – the narrowest audience first.
 */
export const caseTypes: readonly CaseType[] = ["hälsa", "avdelning", "cmt"]

/**
 * Whether an untyped value names a type this module knows.
 * @param value The value to check.
 * @returns True for a known type.
 */
export function isCaseType(value: unknown): value is CaseType {
  return caseTypes.includes(value as CaseType)
}

/**
 * A type a case can be opened as, with the unit a unit's case is kept for.
 */
export interface CaseScope {
  /**
   * The case's type.
   */
  readonly type: CaseType
  /**
   * The unit a unit's case belongs to. Absent for every other type.
   */
  readonly unitNumber?: number
}

/**
 * What a scope is called – "Hälsa", "CMT", or "Avdelning 7" – short, because it stands
 * beside other choices and on a badge. Who it reaches is spelled out elsewhere.
 * @param scope The scope.
 * @returns The name.
 */
export function scopeName(scope: CaseScope): string {
  if (scope.type === "hälsa") {
    return "Hälsa"
  }
  if (scope.type === "cmt") {
    return "CMT"
  }
  return scope.unitNumber === undefined ? "Avdelning" : `Avdelning ${String(scope.unitNumber)}`
}

/**
 * The people whose role reaches a scope's cases, as a sentence's object – "hälsoteamet",
 * "CMT", or "ledarna i avdelning 7".
 * @param scope The scope.
 * @returns The words.
 */
export function holdersOf(scope: CaseScope): string {
  if (scope.type === "hälsa") {
    return "hälsoteamet"
  }
  if (scope.type === "cmt") {
    return "CMT"
  }
  return scope.unitNumber === undefined
    ? "avdelningens ledare"
    : `ledarna i avdelning ${String(scope.unitNumber)}`
}

/**
 * The same people, all of them – "hela hälsoteamet" or "alla ledare i avdelning 7" – for
 * where a sentence says everyone in the group sees a case.
 * @param scope The scope.
 * @returns The words.
 */
export function allHoldersOf(scope: CaseScope): string {
  if (scope.type === "avdelning") {
    return scope.unitNumber === undefined
      ? "alla avdelningens ledare"
      : `alla ledare i avdelning ${String(scope.unitNumber)}`
  }
  return `hela ${holdersOf(scope)}`
}

/**
 * A scope's words with the first letter capitalized, for the start of a line.
 * @param words The words.
 * @returns The words, capitalized.
 */
export function capitalized(words: string): string {
  return words.charAt(0).toLocaleUpperCase("sv") + words.slice(1)
}

/**
 * Whether a case of a scope can be about someone: for a unit's case one of the unit's
 * deltagare, since its leaders are the ones who keep it, and for any other case anyone.
 * @param scope The case's scope.
 * @param person Who it would be about.
 * @returns True when the case can be about them.
 */
export function canBeAbout(scope: CaseScope, person: Person): boolean {
  if (scope.type !== "avdelning") {
    return true
  }
  return person.role === "deltagare" && unitNumberOf(person) === scope.unitNumber
}
