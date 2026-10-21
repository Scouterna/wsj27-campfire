import { persona as health } from "./personas/health.ts"
import { persona as hoc } from "./personas/hoc.ts"
import { persona as leader1 } from "./personas/leader-1.ts"

/**
 * One note in a seeded case, written by the case's creator at the case's secrecy level.
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
 * A case as the seed writes it, before the cases service numbers it.
 */
export interface SeededCase {
  /**
   * The member number of the deltagare it is about.
   */
  readonly aboutMemberNo: string
  /**
   * When it was closed, in minutes after `seededAt`, or undefined while it is open. Its creator
   * closed it.
   */
  readonly closedMinute?: number
  /**
   * The member number of the persona who opened it and wrote its notes.
   */
  readonly creatorMemberNo: string
  /**
   * When it was opened, in minutes after `seededAt`.
   */
  readonly minute: number
  /**
   * Its notes, oldest first, the first written as the case was opened.
   */
  readonly notes: readonly SeededNote[]
  /**
   * Its secrecy level, which its notes share.
   */
  readonly secrecyLevel: number
  readonly title: string
  /**
   * The troop the service stores beside the person, which is their unit in the list of
   * participants.
   */
  readonly troop: string
  readonly type: string
}

/**
 * The moment the seeded cases are dated from. It is fixed, so a seeded case always sorts
 * below one opened while the mock runs.
 */
export const seededAt = Date.UTC(2026, 8, 19, 7)

/**
 * The seeded cases, oldest first, one set for each kind of reader. The health team's are about
 * deltagare in both units – a sprained ankle already closed, and an allergic reaction and a
 * fever still being followed up. The head of contingent follows a deltagare's early journey
 * home, and a unit 1 leader a deltagare's homesickness, so each case type has a case only its
 * own roles reach.
 */
export const cases: readonly SeededCase[] = [
  {
    aboutMemberNo: "1300049",
    closedMinute: 24 * 60,
    creatorMemberNo: health.memberNo,
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
    secrecyLevel: 3,
    title: "Stukad fot",
    troop: "1",
    type: "hälsa",
  },
  {
    aboutMemberNo: "1300035",
    creatorMemberNo: health.memberNo,
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
    secrecyLevel: 3,
    title: "Allergisk reaktion",
    troop: "1",
    type: "hälsa",
  },
  {
    aboutMemberNo: "1300140",
    creatorMemberNo: health.memberNo,
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
    secrecyLevel: 3,
    title: "Feber",
    troop: "2",
    type: "hälsa",
  },
  {
    aboutMemberNo: "1300252",
    creatorMemberNo: hoc.memberNo,
    minute: 36 * 60,
    notes: [
      {
        minute: 36 * 60,
        note: "Alvas föräldrar vill att hon reser hem två dagar före resten av avdelningen, för ett bröllop i familjen.",
        title: "Tidig hemresa",
      },
      {
        minute: 46 * 60 + 30,
        note: "Resebyrån kan boka om tåget från Gdańsk. Föräldrarna möter henne i Malmö.",
        title: "Ombokning",
      },
    ],
    secrecyLevel: 3,
    title: "Tidig hemresa",
    troop: "2",
    type: "cmt",
  },
  {
    aboutMemberNo: "1300084",
    creatorMemberNo: leader1.memberNo,
    minute: 48 * 60,
    notes: [
      {
        minute: 48 * 60,
        note: "Leo har haft hemlängtan sedan i går kväll och vill ringa hem ofta. Patrullen håller honom sällskap, och vi pratar med honom efter lunch.",
        title: "Hemlängtan",
      },
    ],
    secrecyLevel: 3,
    title: "Hemlängtan",
    troop: "1",
    type: "avdelning",
  },
]
