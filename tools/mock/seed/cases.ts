import { persona as health } from "./personas/health.ts"

/**
 * One note in a seeded case.
 */
export interface SeededNote {
  /**
   * When it was written, in minutes after `seededAt`.
   */
  readonly minute: number
  readonly note: string
  readonly title: string
}

/**
 * A case as the seed writes it, before the cases service numbers it. Every seeded case is a
 * health one at the highest secrecy, written by the health persona.
 */
export interface SeededCase {
  /**
   * The member number of the deltagare it is about.
   */
  readonly aboutMemberNo: string
  /**
   * When it was closed, in minutes after `seededAt`, or undefined while it is open.
   */
  readonly closedMinute?: number
  /**
   * When it was opened, in minutes after `seededAt`.
   */
  readonly minute: number
  /**
   * Its notes, oldest first, the first written as the case was opened.
   */
  readonly notes: readonly SeededNote[]
  readonly title: string
  /**
   * The troop the service stores beside the person, which is their unit in the list of
   * participants.
   */
  readonly troop: string
}

/**
 * The moment the seeded cases are dated from. It is fixed, so a seeded case always sorts
 * below one opened while the mock runs.
 */
export const seededAt = Date.UTC(2026, 8, 19, 7)

/**
 * The member number of the one person who writes the seeded cases – Helena Hägg, in the
 * health function.
 */
export const caseAuthor = health.memberNo

/**
 * The health team's cases, oldest first, about deltagare in both units: a sprained ankle
 * already closed, and an allergic reaction and a fever still being followed up.
 */
export const cases: readonly SeededCase[] = [
  {
    aboutMemberNo: "1300049",
    closedMinute: 24 * 60,
    minute: 0,
    notes: [
      {
        minute: 0,
        note: "Ivar snubblade på en rot vid vattenposten och vrickade vänster fot. Lindad och i högläge, han kan belasta foten lite.",
        title: "Stukad fot",
      },
      {
        minute: 11 * 60,
        note: "Svullnaden har gått ner och han går utan att halta. Lindan får sitta kvar till i morgon.",
        title: "Kvällskoll",
      },
    ],
    title: "Stukad fot",
    troop: "1",
  },
  {
    aboutMemberNo: "1300035",
    minute: 24 * 60 + 30,
    notes: [
      {
        minute: 24 * 60 + 30,
        note: "Ester fick klåda och röda utslag på armarna efter frukosten. Ingen andningspåverkan, så EpiPen behövdes inte. Hon tog sin antihistamin.",
        title: "Allergisk reaktion",
      },
      {
        minute: 25 * 60 + 15,
        note: "Utslagen har bleknat. Köket tar reda på vad som fanns i frukostbrödet.",
        title: "Uppföljning",
      },
      {
        minute: 28 * 60,
        note: "Brödet var penslat med ägg. Köket märker upp det framöver, och Ester äter från allergibordet tills vidare.",
        title: "Köket har svarat",
      },
    ],
    title: "Allergisk reaktion",
    troop: "1",
  },
  {
    aboutMemberNo: "1300140",
    minute: 29 * 60 + 45,
    notes: [
      {
        minute: 29 * 60 + 45,
        note: "Molly har 38,6 i feber och ont i halsen. Hon vilar i tältet, dricker och har fått febernedsättande.",
        title: "Feber",
      },
      {
        minute: 35 * 60,
        note: "Febern är nere i 37,9 och hon har ätit lite. Vi tittar till henne igen i morgon bitti.",
        title: "Kvällskoll",
      },
    ],
    title: "Feber",
    troop: "2",
  },
]
