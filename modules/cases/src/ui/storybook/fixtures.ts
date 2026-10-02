/**
 * What the stories' services answer with, in the services' own wire shapes, because the
 * queries cache a payload as it arrived and convert it on the way out. The people are the
 * mock back-end's own seeded contingent, so a story and a walk-through of the running
 * application show the same names.
 */

/**
 * What the service sends for a field with no value, which is `null` because the wire
 * carries Python's `None` that way.
 */
// eslint-disable-next-line unicorn/no-null -- the payloads copy the service's JSON
const absent = null

/**
 * The listing rows the contingent is read from – a few deltagare of unit 1, one IST, and
 * two of the contingent management, who keep the cases.
 */
export const peopleRows: readonly unknown[] = [
  { member_no: 1_300_035, member_type: "Deltagare", name: "Ester Dahl", troop: "1" },
  { member_no: 1_300_049, member_type: "Deltagare", name: "Ivar Forsberg", troop: "1" },
  { member_no: 1_300_077, member_type: "Deltagare", name: "Otto Lind", troop: "1" },
  { member_no: 1_300_287, member_type: "Deltagare", name: "Astrid Forsberg", troop: "1" },
  { member_no: 1_300_098, member_type: "IST", name: "Freja Sandberg", troop: "" },
  { member_no: 1_200_001, member_type: "Kontingentledning", name: "Helena Hägg", troop: "" },
  { member_no: 1_200_002, member_type: "Kontingentledning", name: "Henrik Holm", troop: "" },
]

/**
 * One case as the cases service sends it, with the fields the screens never read filled
 * in as the service fills them.
 * @param fields The fields this case sets.
 * @returns The case's payload.
 */
function caseRow(fields: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  return {
    assigned_to_id: absent,
    closed: false,
    closed_at: absent,
    closed_by_id: absent,
    extra_access: [],
    secrecy_level: 5,
    tags: [],
    type: "hälsa",
    ...fields,
  }
}

/**
 * Every case the stories know, newest first – two open and one closed.
 */
export const caseRows: readonly Readonly<Record<string, unknown>>[] = [
  caseRow({
    about_person_id: 1_300_049,
    created_at: "2027-08-02T07:40:00Z",
    creator_id: 1_200_001,
    id: 3,
    latest_note_at: "2027-08-02T14:15:00Z",
    title: "Stukad fotled",
    troop: "1",
  }),
  caseRow({
    about_person_id: 1_300_098,
    created_at: "2027-08-01T16:20:00Z",
    creator_id: 1_200_002,
    id: 2,
    latest_note_at: absent,
    title: "Allergisk reaktion",
    troop: "",
  }),
  caseRow({
    about_person_id: 1_300_035,
    closed: true,
    closed_at: "2027-08-01T08:00:00Z",
    closed_by_id: 1_200_001,
    created_at: "2027-07-31T09:05:00Z",
    creator_id: 1_200_001,
    id: 1,
    latest_note_at: "2027-08-01T07:55:00Z",
    title: "Feber",
    troop: "1",
  }),
]

/**
 * One note as the cases service sends it.
 * @param fields The fields this note sets.
 * @returns The note's payload.
 */
function noteRow(fields: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  return { extra_access: [], secrecy_level: 5, tags: [], ...fields }
}

/**
 * The notes on each case, by the case's identifier, newest first. The allergy case has
 * none yet.
 */
export const noteRows: Readonly<Record<string, readonly unknown[]>> = {
  "1": [
    noteRow({
      case_id: 1,
      created_at: "2027-08-01T07:55:00Z",
      creator_id: 1_200_001,
      id: 12,
      note: "Feberfri sedan i går kväll. Tillbaka i programmet.",
      title: "Feber",
    }),
    noteRow({
      case_id: 1,
      created_at: "2027-07-31T09:05:00Z",
      creator_id: 1_200_001,
      id: 11,
      note: "38,9 i morse. Vilar i tältet, föräldrarna är kontaktade.",
      title: "Feber",
    }),
  ],
  "2": [],
  "3": [
    noteRow({
      case_id: 3,
      created_at: "2027-08-02T14:15:00Z",
      creator_id: 1_200_002,
      id: 32,
      note: "Röntgen på sjukhuset i Gdańsk visade ingen fraktur.\nLindad, och kryckor i tre dagar.",
      title: "Stukad fotled",
    }),
    noteRow({
      case_id: 3,
      created_at: "2027-08-02T07:40:00Z",
      creator_id: 1_200_001,
      id: 31,
      note: "Snubblade på väg till frukosten. Svullen och öm på utsidan.",
      title: "Stukad fotled",
    }),
  ],
}
