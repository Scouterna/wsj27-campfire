import type { Participant } from "../../model/Participant"
import type { ParticipantsList } from "../../model/ParticipantsList"

/**
 * The people the stories are told about. The cast is the mock back-end's own seeded
 * contingent, transcribed as the domain sees it, so a story and a walk-through of the
 * running application show the same names – and the member numbers are the real ones, so
 * a record seeded by number lines up with the row that opens it.
 */

/**
 * The mock's contingent: units of leaders and deltagare, the IST, and the contingent
 * management. The IST carry no unit, because the participants service does not hold their
 * patrols.
 */
export const cast: readonly Participant[] = [
  {
    memberGroup: "Mockåsens scoutkår",
    memberNo: "1100101",
    firstName: "Lars",
    lastName: "Lindberg",
    role: "ledare",
    unitNumber: 1,
  },
  {
    memberGroup: "Seedviks scoutkår",
    memberNo: "1100402",
    firstName: "Hanna",
    lastName: "Hellström",
    role: "ledare",
    unitNumber: 1,
  },
  {
    memberGroup: "Mockåsens scoutkår",
    memberNo: "1300035",
    firstName: "Ester",
    lastName: "Dahl",
    role: "deltagare",
    unitNumber: 1,
    birthDate: "2012-03-14",
  },
  {
    memberGroup: "Mockåsens scoutkår",
    memberNo: "1300049",
    firstName: "Ivar",
    lastName: "Forsberg",
    role: "deltagare",
    unitNumber: 1,
    birthDate: "2011-11-02",
  },
  {
    memberGroup: "Mockåsens scoutkår",
    memberNo: "1300077",
    firstName: "Otto",
    lastName: "Lind",
    role: "deltagare",
    unitNumber: 1,
    birthDate: "2013-06-21",
  },
  {
    memberGroup: "Seedviks scoutkår",
    memberNo: "1300084",
    firstName: "Leo",
    lastName: "Ström",
    role: "deltagare",
    unitNumber: 1,
    birthDate: "2012-09-05",
  },
  {
    memberGroup: "Seedviks scoutkår",
    memberNo: "1300147",
    firstName: "Edvin",
    lastName: "Malm",
    role: "deltagare",
    unitNumber: 1,
    birthDate: "2013-01-30",
  },
  {
    memberGroup: "Seedviks scoutkår",
    memberNo: "1300287",
    firstName: "Astrid",
    lastName: "Forsberg",
    role: "deltagare",
    unitNumber: 1,
    birthDate: "2012-05-17",
  },
  {
    memberNo: "1300098",
    firstName: "Freja",
    lastName: "Sandberg",
    role: "ist",
  },
  {
    memberGroup: "Stubbhults scoutkår",
    memberNo: "1100201",
    firstName: "Anders",
    lastName: "Andersson",
    role: "ledare",
    unitNumber: 2,
  },
  {
    memberGroup: "Stubbhults scoutkår",
    memberNo: "1300140",
    firstName: "Molly",
    lastName: "Sundqvist",
    role: "deltagare",
    unitNumber: 2,
  },
  {
    memberGroup: "Stubbhults scoutkår",
    memberNo: "1300252",
    firstName: "Alva",
    lastName: "Lundgren",
    role: "deltagare",
    unitNumber: 2,
  },
  {
    memberGroup: "Stubbhults scoutkår",
    memberNo: "1300497",
    firstName: "Axel",
    lastName: "Lind",
    role: "deltagare",
    unitNumber: 2,
  },
  {
    memberGroup: "Fixturby scoutkår",
    memberNo: "1300210",
    firstName: "Nils",
    lastName: "Söderberg",
    role: "ist",
  },
  {
    memberGroup: "Mockåsens scoutkår",
    memberNo: "1200401",
    firstName: "Karin",
    lastName: "Kron",
    role: "kontingentledning",
    funktion: "kontingentledare",
  },
  {
    memberGroup: "Stubbhults scoutkår",
    memberNo: "1200201",
    firstName: "Anna",
    lastName: "Almgren",
    role: "kontingentledning",
    funktion: "administration",
    isFunktionsansvarig: true,
  },
  {
    memberGroup: "Seedviks scoutkår",
    memberNo: "1200202",
    firstName: "Arvid",
    lastName: "Ask",
    role: "kontingentledning",
    funktion: "kommunikation",
  },
  {
    memberGroup: "Fixturby scoutkår",
    memberNo: "1200101",
    firstName: "Pernilla",
    lastName: "Palm",
    role: "kontingentledning",
    funktion: "program",
  },
  {
    memberGroup: "Mockåsens scoutkår",
    memberNo: "1200001",
    firstName: "Helena",
    lastName: "Hägg",
    role: "kontingentledning",
  },
  {
    memberGroup: "Seedviks scoutkår",
    memberNo: "1200002",
    firstName: "Henrik",
    lastName: "Holm",
    role: "kontingentledning",
  },
  {
    memberGroup: "Stubbhults scoutkår",
    memberNo: "1200302",
    firstName: "Sixten",
    lastName: "Segel",
    role: "kontingentledning",
  },
  {
    memberGroup: "Fixturby scoutkår",
    memberNo: "1200301",
    firstName: "Stina",
    lastName: "Strand",
    role: "kontingentledning",
  },
  {
    memberGroup: "Mockåsens scoutkår",
    memberNo: "1200102",
    firstName: "Patrik",
    lastName: "Ply",
    role: "kontingentledning",
  },
]

/**
 * The cast as the contingent management reads it: everybody, in one list.
 */
export const wholeList: ParticipantsList = { people: cast, scope: { kind: "all" } }

/**
 * One unit alone, as its leader reads it.
 * @param unitNumber The unit to list.
 * @returns The list, scoped to that unit.
 */
export function unitList(unitNumber: number): ParticipantsList {
  return {
    people: cast.filter((person) => person.unitNumber === unitNumber),
    scope: { kind: "unit", unitNumber },
  }
}

/**
 * Nobody: the list a viewer with no grants is given, which is an answer rather than a
 * failure.
 */
export const nobodyList: ParticipantsList = { people: [], scope: { kind: "nobody" } }

// Enough names, with å, ä, and ö among them, that a search and a Swedish sort over the
// generated list below are answering something real rather than a few repeated rows.
const firstNames = [
  "Åsa",
  "Elias",
  "Maja",
  "Nour",
  "Vera",
  "Liam",
  "Ebba",
  "Hugo",
  "Märta",
  "Öyvind",
  "Selma",
  "Ali",
]
const lastNames = [
  "Andersson",
  "Berg",
  "Ek",
  "Holm",
  "Lund",
  "Nilsson",
  "Sjöö",
  "Vik",
  "Ödman",
  "Ängström",
  "Hällström",
]

/**
 * The units the contingent is divided into – the real number, so the unit browser
 * generated below is the length it will actually be.
 */
const unitCount = 53

/**
 * How many leaders each unit has, and how many of the whole are IST or contingent
 * management – roughly the real contingent's shape, which is what makes the list's cost
 * at scale an honest measurement.
 */
const leadersPerUnit = 4
const istCount = 150
const cmtCount = 30

/**
 * One generated seat in the contingent. The management is handed out first, then the IST,
 * then the units – so a smaller count still produces a shape rather than only deltagare –
 * and the unit seats go round by round across every unit, which makes the first rounds
 * each unit's leaders and everything after them its deltagare.
 * @param index The seat's position in the whole contingent.
 * @returns What that seat is, and which unit it belongs to.
 */
function seatAt(index: number): Pick<Participant, "role" | "unitNumber"> {
  if (index < cmtCount) {
    return { role: "kontingentledning" }
  }
  const seat = index - cmtCount - istCount
  if (seat < 0) {
    return { role: "ist" }
  }
  return {
    role: Math.floor(seat / unitCount) < leadersPerUnit ? "ledare" : "deltagare",
    unitNumber: (seat % unitCount) + 1,
  }
}

/**
 * A list the size of the real contingent, for the one thing the cast cannot show: how
 * the screens behave at scale.
 *
 * Generated rather than written, because nobody should read it. The names repeat on
 * purpose; that they repeat unevenly is the point, so a search matches a plausible number
 * of rows rather than all of them or one.
 * @param count How many people to generate. Smaller than the IST and the management
 * together gives a list of those alone.
 * @returns The whole generated contingent, as one list.
 */
export function largePeopleList(count = 2600): ParticipantsList {
  const people: Participant[] = Array.from({ length: count }, (_, index) => ({
    memberNo: String(1_000_000 + index),
    // Strides that share no factor with the name lists' lengths, so every first name
    // meets every last name rather than the pairs repeating early.
    firstName: firstNames[index % firstNames.length] ?? "Åsa",
    lastName: lastNames[(index * 7) % lastNames.length] ?? "Berg",
    ...seatAt(index),
  }))

  return { people, scope: { kind: "all" } }
}
