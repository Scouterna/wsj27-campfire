import { capitalized, holdersOf, type CaseScope } from "./CaseType"

/**
 * How far a case reaches beyond its creator, fixed when it is opened: 3 for everyone the
 * type's role reaches, and anyone it is shared with; 4 for the role alone, never shared;
 * 5 for the creator alone, and anyone they share it with. The service holds 1 and 2 back
 * for cases more open than these.
 */
export type SecrecyLevel = 3 | 4 | 5

/**
 * Every level, in the order a form offers them – the widest first.
 */
export const secrecyLevels: readonly SecrecyLevel[] = [3, 4, 5]

/**
 * The levels a case of a scope may be opened at, the widest first. A unit's case leaves
 * out its role alone, because a unit's leaders are few and all of them read the unit's
 * cases, so shutting out everyone else it could be shared with says nothing a leader needs.
 * @param scope The case's scope.
 * @returns The levels.
 */
export function levelsFor(scope: CaseScope): readonly SecrecyLevel[] {
  return scope.type === "avdelning" ? secrecyLevels.filter((level) => level !== 4) : secrecyLevels
}

/**
 * The level a case gets when nobody chooses another, and the one the service defaults to.
 */
export const defaultSecrecyLevel: SecrecyLevel = 3

/**
 * Whether an untyped value is a level this module knows.
 * @param value The value to check.
 * @returns True for 3, 4, or 5.
 */
export function isSecrecyLevel(value: unknown): value is SecrecyLevel {
  return secrecyLevels.includes(value as SecrecyLevel)
}

/**
 * A level as a form offers it: who sees the case, and what that means beyond it.
 */
export interface LevelChoice {
  /**
   * What the level does that the others do not, in a sentence.
   */
  readonly description: string
  /**
   * Who sees the case, as the choice's heading.
   */
  readonly title: string
}

/**
 * How a form offers a level for a case of one scope.
 * @param level The level.
 * @param scope The case's scope, which names who the role reaches.
 * @returns The heading and the sentence under it.
 */
export function levelChoice(level: SecrecyLevel, scope: CaseScope): LevelChoice {
  if (level === 3) {
    return {
      description: "Det vanliga. Ärendet kan också delas med enskilda personer.",
      title: capitalized(holdersOf(scope)),
    }
  }
  if (level === 4) {
    return {
      description: "Ärendet kan aldrig delas med någon annan.",
      title: `Bara ${holdersOf(scope)}`,
    }
  }
  return {
    description: "Ingen annan ser ärendet, om du inte delar det.",
    title: "Bara du",
  }
}

/**
 * The levels a note may be written at on a case, its own first: never below the case's,
 * the role alone only on a case open to more than its role, only to one of its role
 * holders, and never on a unit's case, and the author alone on any case not already that
 * private.
 * @param caseLevel The case's level, which a note may not be below.
 * @param scope The case's scope, since a unit's case offers no level its own does not.
 * @param isRoleHolder Whether the writer holds the case's role, since someone it is only
 * shared with may not shut the others out.
 * @returns The levels, from the case's own upward.
 */
export function noteLevels(
  caseLevel: SecrecyLevel,
  scope: CaseScope,
  isRoleHolder: boolean,
): readonly SecrecyLevel[] {
  return levelsFor(scope).filter(
    (level) => level === caseLevel || (level > caseLevel && (level !== 4 || isRoleHolder)),
  )
}

/**
 * Who reads a note at a level, as a choice or a mark names it – everyone who sees the case
 * at its own level, its role alone at 4, and its author alone at 5. Short, because the
 * choices stand side by side.
 * @param level The note's level.
 * @param caseLevel Its case's level.
 * @param scope Its case's scope, which names whose role it is.
 * @returns The words.
 */
export function noteAudience(
  level: SecrecyLevel,
  caseLevel: SecrecyLevel,
  scope: CaseScope,
): string {
  if (level === caseLevel) {
    return "Alla"
  }
  return level === 4 ? `Bara ${holdersOf(scope)}` : "Bara du"
}
