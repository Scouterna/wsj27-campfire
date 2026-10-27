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
   * Whether someone holds the type's role and so sees a case open to it – undefined for
   * somebody it cannot tell about, since a leader reads the management's names without
   * their functions. Absent where the list of participants cannot tell for anyone.
   */
  readonly holdsRole?: (person: Person) => boolean | undefined
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
 * @param type The type, by the name the cases service gives it.
 * @returns The profile, made from the name alone.
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
          `Alla i gruppen ${name} ser ärendet. Du kan också dela det med enskilda ledare och personer i CMT.`,
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
 * with the leaders of the units of the people it is about, because all of CMT sees it
 * already.
 */
const profiles: ReadonlyMap<string, CaseTypeProfile> = new Map<string, CaseTypeProfile>([
  [
    "hälsa",
    {
      holdsRole: (person) => {
        if (person.role !== "kontingentledning") {
          return false
        }
        return person.funktion === undefined ? undefined : person.funktion === "Hälsosupport"
      },
      isUnitBound: false,
      levels: [3, 4, 5],
      sharesWith: { open: leadersAndCmt, private: leadersAndCmt },
      words: () => ({
        described: new Map<SecrecyLevel, string>([
          [
            3,
            "Alla i hälsoteamet ser ärendet. Du kan också dela det med enskilda ledare och personer i CMT.",
          ],
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
          everyone: unit === undefined ? "alla ledare i avdelningen" : `alla ledare i ${unit}`,
          group: unit === undefined ? "avdelningens ledare" : `ledarna i ${unit}`,
          name: capitalized(unit ?? "avdelning"),
        }
      },
    },
  ],
  [
    "cmt",
    {
      holdsRole: (person) => person.role === "kontingentledning",
      isUnitBound: false,
      levels: [3, 4, 5],
      sharesWith: { open: ["unitLeaders"], private: ["cmt", "unitLeaders"] },
      words: () => ({
        described: new Map<SecrecyLevel, string>([
          [
            3,
            "Alla i CMT ser ärendet. Du kan också dela det med ledarna i de berörda avdelningarna.",
          ],
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
 * @returns The profile, the type's own or one made from its name.
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
 * A scope as a reader is told about it: without its unit where that is the one unit they
 * lead, since the unit would tell them nothing, and as it is everywhere else. For words
 * only – a write always names the unit.
 * @param scope The scope to word.
 * @param ownUnit The one unit the reader leads, undefined for everyone else.
 * @returns The scope to take the words from.
 */
export function asSeenBy(scope: CaseScope, ownUnit: number | undefined): CaseScope {
  return scope.unitNumber !== undefined && scope.unitNumber === ownUnit
    ? { type: scope.type }
    : scope
}

/**
 * The badge naming what kind of case a scope is, left out for a reader whose own unit it
 * is, because every case they keep is that unit's.
 * @param scope The case's scope.
 * @param ownUnit The one unit the reader leads, undefined for everyone else.
 * @returns The badge, or undefined where it would say nothing.
 */
export function scopeBadge(scope: CaseScope, ownUnit: number | undefined): string | undefined {
  return asSeenBy(scope, ownUnit) === scope ? scopeName(scope) : undefined
}

/**
 * A scope's words, from its type's profile.
 * @param scope The scope whose type's words to use.
 * @returns The words, for the unit where the type is bound to one.
 */
export function wordsOf(scope: CaseScope): CaseTypeWords {
  return profileOf(scope.type).words(scope.unitNumber)
}

/**
 * What a scope is called – "Hälsa", "CMT", or "Avdelning 7" – short, because it stands
 * beside other choices and on a badge. Who it reaches is spelled out elsewhere.
 * @param scope The scope to name.
 * @returns The name, capitalized for a badge.
 */
export function scopeName(scope: CaseScope): string {
  return wordsOf(scope).name
}

/**
 * The people whose role reaches a scope's cases, as a sentence's object – "hälsoteamet",
 * "CMT", or "ledarna i avdelning 7".
 * @param scope The scope whose role holders to name.
 * @returns The words, as a sentence's object.
 */
export function holdersOf(scope: CaseScope): string {
  return wordsOf(scope).group
}

/**
 * The same people, all of them – "hela hälsoteamet" or "alla ledare i avdelning 7" – for
 * where a sentence says everyone in the group sees a case.
 * @param scope The scope whose role holders to name.
 * @returns The words, with everyone included.
 */
export function allHoldersOf(scope: CaseScope): string {
  return wordsOf(scope).everyone
}

/**
 * Words with the first letter capitalized, for the start of a line.
 * @param words The words, starting with any letter.
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
