import { istPatrolNumbered } from "../../model/IstPatrol"
import type { Participant } from "../../model/Participant"
import type { ParticipantDetail } from "../../model/ParticipantDetail"
import type { ParticipantsList } from "../../model/ParticipantsList"
import { unitNumbered } from "../../model/Unit"

/**
 * The people the stories are told about. The cast is the mock back-end's own seeded
 * contingent, transcribed as the domain sees it, so a story and a walk-through of the
 * running application show the same names – and the member numbers are the real ones, so
 * a record seeded by number lines up with the row that opens it.
 */

/**
 * The mock's contingent: units of leaders and deltagare, the IST, and the contingent
 * management. The IST carry a patrol of their own rather than a unit, and one of them is
 * in no patrol yet.
 */
export const cast: readonly Participant[] = [
  {
    memberGroup: "Mockåsens scoutkår",
    memberNo: "1100101",
    gender: "man",
    homeTown: "Göteborg",
    firstName: "Lars",
    lastName: "Lindberg",
    role: "ledare",
    unit: unitNumbered(1),
    unitPatrol: { name: "Falkarna" },
  },
  {
    memberGroup: "Seedviks scoutkår",
    memberNo: "1100402",
    gender: "kvinna",
    homeTown: "Mölndal",
    firstName: "Hanna",
    lastName: "Hellström",
    role: "ledare",
    unit: unitNumbered(1),
    unitPatrol: { name: "Uttrarna" },
  },
  {
    memberGroup: "Mockåsens scoutkår",
    memberNo: "1300035",
    gender: "kvinna",
    homeTown: "Kungsbacka",
    firstName: "Ester",
    lastName: "Dahl",
    role: "deltagare",
    unit: unitNumbered(1),
    unitPatrol: { name: "Falkarna" },
    birthDate: "2012-03-14",
  },
  {
    memberGroup: "Mockåsens scoutkår",
    memberNo: "1300049",
    gender: "man",
    homeTown: "Partille",
    firstName: "Ivar",
    lastName: "Forsberg",
    role: "deltagare",
    unit: unitNumbered(1),
    unitPatrol: { name: "Uttrarna" },
    birthDate: "2011-11-02",
  },
  {
    memberGroup: "Mockåsens scoutkår",
    memberNo: "1300077",
    gender: "okant",
    homeTown: "Göteborg",
    firstName: "Otto",
    lastName: "Lind",
    role: "deltagare",
    unit: unitNumbered(1),
    unitPatrol: { name: "Falkarna" },
    birthDate: "2013-06-21",
  },
  {
    memberGroup: "Seedviks scoutkår",
    memberNo: "1300084",
    gender: "man",
    homeTown: "Lerum",
    firstName: "Leo",
    lastName: "Ström",
    role: "deltagare",
    unit: unitNumbered(1),
    unitPatrol: { name: "Uttrarna" },
    birthDate: "2012-09-05",
  },
  {
    memberGroup: "Seedviks scoutkår",
    memberNo: "1300147",
    gender: "annat",
    homeTown: "Alingsås",
    firstName: "Edvin",
    lastName: "Malm",
    role: "deltagare",
    unit: unitNumbered(1),
    unitPatrol: { name: "Falkarna" },
    birthDate: "2013-01-30",
  },
  {
    memberGroup: "Seedviks scoutkår",
    memberNo: "1300287",
    gender: "kvinna",
    homeTown: "Kungälv",
    firstName: "Astrid",
    lastName: "Forsberg",
    role: "deltagare",
    unit: unitNumbered(1),
    unitPatrol: { name: "Uttrarna" },
    birthDate: "2012-05-17",
  },
  {
    memberNo: "1300098",
    firstName: "Freja",
    lastName: "Sandberg",
    role: "ist",
    istPatrol: istPatrolNumbered(1),
  },
  {
    memberGroup: "Stubbhults scoutkår",
    memberNo: "1100201",
    homeTown: "Stockholm",
    firstName: "Anders",
    lastName: "Andersson",
    role: "ledare",
    unit: unitNumbered(2),
    unitPatrol: { name: "Hökarna" },
  },
  {
    memberGroup: "Stubbhults scoutkår",
    memberNo: "1300140",
    homeTown: "Solna",
    firstName: "Molly",
    lastName: "Sundqvist",
    role: "deltagare",
    unit: unitNumbered(2),
    unitPatrol: { name: "Hökarna" },
  },
  {
    memberGroup: "Stubbhults scoutkår",
    memberNo: "1300252",
    homeTown: "Täby",
    firstName: "Alva",
    lastName: "Lundgren",
    role: "deltagare",
    unit: unitNumbered(2),
    unitPatrol: { name: "Ekorrarna" },
  },
  {
    memberGroup: "Stubbhults scoutkår",
    memberNo: "1300497",
    homeTown: "Nacka",
    firstName: "Axel",
    lastName: "Lind",
    role: "deltagare",
    unit: unitNumbered(2),
    unitPatrol: { name: "Bävrarna" },
  },
  {
    memberGroup: "Fixturby scoutkår",
    memberNo: "1300210",
    homeTown: "Stockholm",
    firstName: "Nils",
    lastName: "Söderberg",
    role: "ist",
    istPatrol: istPatrolNumbered(7),
  },
  {
    memberGroup: "Seedviks scoutkår",
    memberNo: "1300533",
    homeTown: "Uppsala",
    firstName: "Tove",
    lastName: "Ekman",
    role: "ist",
  },
  {
    memberGroup: "Mockåsens scoutkår",
    memberNo: "1200401",
    homeTown: "Umeå",
    firstName: "Karin",
    lastName: "Kron",
    role: "kontingentledning",
    funktion: "kontingentledare",
  },
  {
    memberGroup: "Stubbhults scoutkår",
    memberNo: "1200201",
    homeTown: "Malmö",
    firstName: "Anna",
    lastName: "Almgren",
    role: "kontingentledning",
    funktion: "administration",
    isFunktionsansvarig: true,
  },
  {
    memberGroup: "Seedviks scoutkår",
    memberNo: "1200202",
    homeTown: "Linköping",
    firstName: "Arvid",
    lastName: "Ask",
    role: "kontingentledning",
    funktion: "kommunikation",
  },
  {
    memberGroup: "Fixturby scoutkår",
    memberNo: "1200101",
    homeTown: "Östersund",
    firstName: "Pernilla",
    lastName: "Palm",
    role: "kontingentledning",
    funktion: "program",
  },
  {
    memberGroup: "Mockåsens scoutkår",
    memberNo: "1200001",
    homeTown: "Karlstad",
    firstName: "Helena",
    lastName: "Hägg",
    role: "kontingentledning",
  },
  {
    memberGroup: "Seedviks scoutkår",
    memberNo: "1200002",
    homeTown: "Luleå",
    firstName: "Henrik",
    lastName: "Holm",
    role: "kontingentledning",
  },
  {
    memberGroup: "Stubbhults scoutkår",
    memberNo: "1200302",
    homeTown: "Växjö",
    firstName: "Sixten",
    lastName: "Segel",
    role: "kontingentledning",
  },
  {
    memberGroup: "Fixturby scoutkår",
    memberNo: "1200301",
    homeTown: "Visby",
    firstName: "Stina",
    lastName: "Strand",
    role: "kontingentledning",
  },
  {
    memberGroup: "Mockåsens scoutkår",
    memberNo: "1200102",
    homeTown: "Gävle",
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
    people: cast.filter((person) => person.unit?.number === unitNumber),
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

// Kårer and towns as long as the real ones run, so a row's one detail line is tried
// against a name that does not fit as well as the ones that do.
const memberGroups = [
  "Mockåsens scoutkår",
  "Scoutkåren Sankt Görans Seedvikspojkar och -flickor",
  "Fixturby scoutkår",
]
const homeTowns = ["Göteborg", "Upplands Väsby", "Bryssel (Belgien)", "Östra Sönnarslöv", "Umeå"]

/**
 * The units the contingent is divided into – the real number, so the groups view
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
 * The IST patrols, and how often an IST member is in none – the real number of patrols,
 * so the groups view lists every one.
 */
const istPatrolCount = 44
const istUnpatrolledEvery = 15

/**
 * One generated seat in the contingent. The management is handed out first, then the IST,
 * then the units – so a smaller count still produces a shape rather than only deltagare –
 * and the unit seats go round by round across every unit, which makes the first rounds
 * each unit's leaders and everything after them its deltagare.
 * @param index The seat's position in the whole contingent.
 * @returns What that seat is, and which unit or IST patrol it belongs to.
 */
function seatAt(index: number): Pick<Participant, "istPatrol" | "role" | "unit"> {
  if (index < cmtCount) {
    return { role: "kontingentledning" }
  }
  const seat = index - cmtCount - istCount
  if (seat < 0) {
    const istSeat = index - cmtCount
    return istSeat % istUnpatrolledEvery === 0
      ? { role: "ist" }
      : { istPatrol: istPatrolNumbered((istSeat % istPatrolCount) + 1), role: "ist" }
  }
  return {
    role: Math.floor(seat / unitCount) < leadersPerUnit ? "ledare" : "deltagare",
    unit: unitNumbered((seat % unitCount) + 1),
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
  const people: Participant[] = Array.from({ length: count }, (_, index) => {
    // Every thirteenth without a kår and every seventeenth without a town, so a row says
    // one, the other, both, or neither. Stepped a whole name round at a time, and gapped
    // by primes the name lists share no factor with, so one name meets every kår, every
    // town, and every gap rather than always the same.
    const round = Math.floor(index / firstNames.length)
    const memberGroup = index % 13 === 0 ? undefined : memberGroups[round % memberGroups.length]
    const homeTown = index % 17 === 0 ? undefined : homeTowns[round % homeTowns.length]
    return {
      memberNo: String(1_000_000 + index),
      // Strides that share no factor with the name lists' lengths, so every first name
      // meets every last name rather than the pairs repeating early.
      firstName: firstNames[index % firstNames.length] ?? "Åsa",
      lastName: lastNames[(index * 7) % lastNames.length] ?? "Berg",
      ...seatAt(index),
      ...(memberGroup !== undefined && { memberGroup }),
      ...(homeTown !== undefined && { homeTown }),
    }
  })

  return { people, scope: { kind: "all" } }
}

/**
 * A unit at its real size – its deltagare and its ledare – living where the towns say,
 * for the unit's map. The towns go round in order, so one written twice is home to twice
 * as many.
 * @param homeTowns The towns to hand out, the same one repeated to weight it. None gives
 *   a unit nobody's town is known for.
 * @returns Unit 1, with a town on everybody when any are given.
 */
export function unitWithHomeTowns(homeTowns: readonly string[]): ParticipantsList {
  const people = Array.from({ length: 40 }, (_, index): Participant => {
    const homeTown = homeTowns[index % homeTowns.length]
    return {
      firstName: firstNames[index % firstNames.length] ?? "Ester",
      lastName: lastNames[(index * 7) % lastNames.length] ?? "Dahl",
      memberGroup: memberGroups[index % memberGroups.length] ?? "Mockåsens scoutkår",
      memberNo: String(1_500_000 + index),
      role: index < 4 ? "ledare" : "deltagare",
      unit: unitNumbered(1),
      ...(homeTown !== undefined && { homeTown }),
      ...(index >= 4 && { birthDate: `2012-0${String((index % 9) + 1)}-15` }),
    }
  })
  return { people, scope: { kind: "unit", unitNumber: 1 } }
}

// Patrol names as a unit might choose them, dealt round the unit's people below.
const patrolNames = ["Falkarna", "Uttrarna", "Ugglorna"]
const genders = ["kvinna", "man", "kvinna", "man", "annat"] as const
const unitTowns = ["Stockholm", "Uppsala", "Täby", "Nacka", "Solna", "Norrtälje", "Huddinge"]

/**
 * A unit at its real size, three patrols in and some of its scouts still in none – every
 * scout with a gender, an age, a kår, and a town, so each patrol has figures to weigh.
 * @param placed How many of the scouts are in a patrol already, dealt round the patrols
 *   in turn. The leaders but the fourth lead one each whenever any scout is placed.
 * @returns Unit 1, divided as far as asked.
 */
export function unitInPatrols(placed = 27): ParticipantsList {
  const people = Array.from({ length: 40 }, (_, index): Participant => {
    const isLeader = index < 4
    const scout = index - 4
    const leads = placed > 0 ? patrolNames.at(index) : undefined
    const joins = scout < placed ? patrolNames.at(scout % patrolNames.length) : undefined
    const patrol = isLeader ? leads : joins
    return {
      birthDate: isLeader
        ? "1990-05-01"
        : `201${String(1 + (index % 3))}-0${String((index % 9) + 1)}-15`,
      firstName: firstNames[index % firstNames.length] ?? "Ester",
      gender: genders[index % genders.length] ?? "kvinna",
      homeTown: unitTowns[index % unitTowns.length] ?? "Stockholm",
      lastName: lastNames[(index * 7) % lastNames.length] ?? "Dahl",
      memberGroup: memberGroups[index % memberGroups.length] ?? "Mockåsens scoutkår",
      memberNo: String(1_600_000 + index),
      role: isLeader ? "ledare" : "deltagare",
      unit: unitNumbered(1),
      ...(patrol !== undefined && { unitPatrol: { name: patrol } }),
    }
  })
  return { people, scope: { kind: "unit", unitNumber: 1 } }
}

/**
 * The records of `unitInPatrols` in full, a few of its scouts with needs a leader plans a
 * patrol around – a serious nut allergy, a special diet, a medication, and a note to the
 * leaders – and everybody else with none.
 * @returns The records.
 */
export function unitInPatrolsDetails(): readonly ParticipantDetail[] {
  const vaccinations = {
    childhoodProgram: true,
    diphtheria: { kind: "notGiven" },
    tetanus: { kind: "notGiven" },
  } as const
  const needs: ReadonlyMap<number, Pick<ParticipantDetail, "health" | "notes">> = new Map([
    [
      5,
      {
        health: {
          foodAllergy: {
            details: "Jordnötter ger anafylaxi – bär EpiPen.",
            severities: [{ allergen: "nuts", severity: 5 }],
          },
          vaccinations,
        },
        notes: [],
      },
    ],
    [8, { health: { diet: { sort: "vegetarian" }, vaccinations }, notes: [] }],
    [
      12,
      {
        health: {
          medication: { details: "Astmamedicin vid behov.", managesOwn: true },
          vaccinations,
        },
        notes: [],
      },
    ],
    [
      20,
      {
        health: { vaccinations },
        notes: [{ audience: "avdelningsledaren", text: "Sover dåligt i stora tält." }],
      },
    ],
  ])
  return unitInPatrols().people.map((person, index) => ({
    ...person,
    contact: { email: "", emergencyContacts: [], phone: "", relatives: [] },
    ...(needs.get(index) ?? { health: { vaccinations }, notes: [] }),
  }))
}
