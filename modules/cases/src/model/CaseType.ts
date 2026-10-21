import { unitNumberOf, type Person } from "./Person"
import type { SecrecyLevel } from "./SecrecyLevel"

/**
 * Someone a case can be shared with, by who they are to it – any leader, a leader of the
 * case's own unit, or anyone in CMT.
 */
export type ShareAudience = "cmt" | "leaders" | "unitLeaders"

/**
 * A type's words for one scope, as the screens put them in sentences.
 */
export interface CaseTypeWords {
  /**
   * What each level a form offers means for the type, under the level's heading. A level
   * the type does not offer has none.
   */
  readonly described: ReadonlyMap<SecrecyLevel, string>
  /**
   * Everyone the type's role reaches, for a sentence saying all of them see a case –
   * "hela hälsoteamet".
   */
  readonly everyone: string
  /**
   * The people the type's role reaches, as a sentence's object – "hälsoteamet".
   */
  readonly group: string
  /**
   * What the type is called, short enough for a badge – "Hälsa".
   */
  readonly name: string
}

/**
 * How Campfire treats one case type: what it is called, whether it belongs to a unit, the
 * levels it is opened at, and who it can be shared with. Every type goes through the same
 * code, and only its profile differs.
 */
export interface CaseTypeProfile {
  /**
   * Whether a case belongs to one unit, whose leaders alone hold its role – so it is
   * offered once for every unit the reader leads, and is about one of the unit's deltagare.
   */
  readonly isUnitBound: boolean
  /**
   * The levels a case may be opened at, the widest first.
   */
  readonly levels: readonly SecrecyLevel[]
  /**
   * Who a case may be shared with, among those who do not see it already – while it is
   * open to the type's role, and while it is private to its creator.
   */
  readonly sharesWith: {
    readonly open: readonly ShareAudience[]
    readonly private: readonly ShareAudience[]
  }
  /**
   * The type's words for a scope – the unit, for a type that belongs to one.
   */
  readonly words: (unitNumber: number | undefined) => CaseTypeWords
}

/**
 * What the last level says, which is the same for a type that shares beyond its unit.
 */
const privateToCreator = "Ingen annan ser ärendet förrän du delar det."

/**
 * Leaders and CMT, the only people the cases service lets open a case at all, and so the
 * widest a case can be shared.
 */
const leadersAndCmt: readonly ShareAudience[] = ["leaders", "cmt"]

/**
 * The profile of a type nobody wrote one for, by the name the service gives it: called by
 * that name, its people worded as its group, every level offered, and shared as widely as
 * a case can be, since who holds its role is not in the list of participants.
 * @param type The type.
 * @returns The profile.
 */
function profileNamed(type: string): CaseTypeProfile {
  const name = capitalized(type.trim())
  return {
    isUnitBound: false,
    levels: [3, 4, 5],
    sharesWith: { open: leadersAndCmt, private: leadersAndCmt },
    words: () => ({
      described: new Map<SecrecyLevel, string>([
        [
          3,
          `Alla i gruppen ${name} ser ärendet. Du kan också dela det med enskilda ledare och CMT.`,
        ],
        [4, `Alla i gruppen ${name} ser ärendet, men det kan aldrig delas med någon annan.`],
        [5, privateToCreator],
      ]),
      everyone: `hela gruppen ${name}`,
      group: `gruppen ${name}`,
      name,
    }),
  }
}

/**
 * The types this module has words of its own for, in the order a form offers them – the
 * narrowest audience first. A unit's case is shared within its unit alone, and a CMT case
 * with the leaders of its person's unit, because all of CMT sees it already.
 */
const profiles: ReadonlyMap<string, CaseTypeProfile> = new Map<string, CaseTypeProfile>([
  [
    "hälsa",
    {
      isUnitBound: false,
      levels: [3, 4, 5],
      sharesWith: { open: leadersAndCmt, private: leadersAndCmt },
      words: () => ({
        described: new Map<SecrecyLevel, string>([
          [3, "Alla i hälsoteamet ser ärendet. Du kan också dela det med enskilda ledare och CMT."],
          [4, "Alla i hälsoteamet ser ärendet, men det kan aldrig delas med någon annan."],
          [5, privateToCreator],
        ]),
        everyone: "hela hälsoteamet",
        group: "hälsoteamet",
        name: "Hälsa",
      }),
    },
  ],
  [
    "avdelning",
    {
      isUnitBound: true,
      // Without 4, because a unit's leaders are few and all of them read the unit's cases,
      // so shutting out everyone it could be shared with says nothing a leader needs.
      levels: [3, 5],
      sharesWith: { open: [], private: ["unitLeaders"] },
      words: (unitNumber) => {
        const unit = unitNumber === undefined ? undefined : `avdelning ${String(unitNumber)}`
        return {
          described: new Map<SecrecyLevel, string>([
            [3, `Alla ledare i ${unit ?? "avdelningen"} ser ärendet.`],
            [5, "Ingen annan ser ärendet förrän du delar det med en annan ledare i avdelningen."],
          ]),
          everyone: unit === undefined ? "alla avdelningens ledare" : `alla ledare i ${unit}`,
          group: unit === undefined ? "avdelningens ledare" : `ledarna i ${unit}`,
          name: capitalized(unit ?? "avdelning"),
        }
      },
    },
  ],
  [
    "cmt",
    {
      isUnitBound: false,
      levels: [3, 4, 5],
      sharesWith: { open: ["unitLeaders"], private: ["cmt", "unitLeaders"] },
      words: () => ({
        described: new Map<SecrecyLevel, string>([
          [3, "Alla i CMT ser ärendet. Du kan också dela det med ledarna i personens avdelning."],
          [4, "Alla i CMT ser ärendet, men det kan aldrig delas med någon annan."],
          [5, privateToCreator],
        ]),
        everyone: "hela CMT",
        group: "CMT",
        name: "CMT",
      }),
    },
  ],
])

/**
 * How Campfire treats a type – its own profile, or one made from its name for a type
 * nobody wrote one for.
 * @param type The type, by the name the cases service gives it.
 * @returns The profile.
 */
export function profileOf(type: string): CaseTypeProfile {
  return profiles.get(type) ?? profileNamed(type)
}

/**
 * Whether an untyped value can name a type – any text with something in it, since the
 * cases service decides which types exist.
 * @param value The value to check.
 * @returns True for a type.
 */
export function isCaseType(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== ""
}

/**
 * Types in the order a form offers them: those with a profile of their own in its order,
 * then any other in the order given.
 * @param types The types, in the service's order.
 * @returns The same types, ordered.
 */
export function inFormOrder(types: readonly string[]): readonly string[] {
  const given = new Set(types)
  const known = profiles
    .keys()
    .filter((type) => given.has(type))
    .toArray()
  const others = [...given].filter((type) => !profiles.has(type))
  return [...known, ...others]
}

/**
 * A type a case can be opened as, with the unit a case of a unit-bound type is kept for.
 */
export interface CaseScope {
  /**
   * The case's type, by the name the cases service gives it.
   */
  readonly type: string
  /**
   * The unit the case belongs to, for a type bound to one. Absent for every other type.
   */
  readonly unitNumber?: number
}

/**
 * A scope's words, from its type's profile.
 * @param scope The scope.
 * @returns The words.
 */
export function wordsOf(scope: CaseScope): CaseTypeWords {
  return profileOf(scope.type).words(scope.unitNumber)
}

/**
 * What a scope is called – "Hälsa", "CMT", or "Avdelning 7" – short, because it stands
 * beside other choices and on a badge. Who it reaches is spelled out elsewhere.
 * @param scope The scope.
 * @returns The name.
 */
export function scopeName(scope: CaseScope): string {
  return wordsOf(scope).name
}

/**
 * The people whose role reaches a scope's cases, as a sentence's object – "hälsoteamet",
 * "CMT", or "ledarna i avdelning 7".
 * @param scope The scope.
 * @returns The words.
 */
export function holdersOf(scope: CaseScope): string {
  return wordsOf(scope).group
}

/**
 * The same people, all of them – "hela hälsoteamet" or "alla ledare i avdelning 7" – for
 * where a sentence says everyone in the group sees a case.
 * @param scope The scope.
 * @returns The words.
 */
export function allHoldersOf(scope: CaseScope): string {
  return wordsOf(scope).everyone
}

/**
 * Words with the first letter capitalized, for the start of a line.
 * @param words The words.
 * @returns The words, capitalized.
 */
export function capitalized(words: string): string {
  return words.charAt(0).toLocaleUpperCase("sv") + words.slice(1)
}

/**
 * Whether a case of a scope can be about someone: for a type bound to a unit one of the
 * unit's deltagare, since its leaders are the ones who keep it, and for any other anyone.
 * @param scope The case's scope.
 * @param person Who it would be about.
 * @returns True when the case can be about them.
 */
export function canBeAbout(scope: CaseScope, person: Person): boolean {
  if (!profileOf(scope.type).isUnitBound) {
    return true
  }
  return person.role === "deltagare" && unitNumberOf(person) === scope.unitNumber
}
