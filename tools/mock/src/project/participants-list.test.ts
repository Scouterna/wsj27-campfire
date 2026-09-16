import { describe, expect, it } from "vitest"

import { forms, participants, readCmtRoles } from "../../seed/participants/index.ts"
import { decodeParticipantsList, type ParticipantRecord } from "./participants-list.ts"
import { loadCmtRoles } from "./roles.ts"

const participantsList = decodeParticipantsList(participants, forms, loadCmtRoles(readCmtRoles()))

function decoded(memberNo: number): ParticipantRecord {
  const record = participantsList.get(memberNo)
  if (record === undefined) {
    throw new Error(`No decoded participant ${String(memberNo)}`)
  }
  return record
}

function formsData(
  record: ParticipantRecord,
): Record<string, Record<string, Record<string, Record<string, unknown>>>> {
  return record.forms_data as Record<
    string,
    Record<string, Record<string, Record<string, unknown>>>
  >
}

// Lars, unit 1's first leader, seeded with contact people, a diet, and an allergy.
const lars = decoded(1_100_101)

describe("the decoded list of participants", () => {
  it("carries the basic block in the service's names, in the service's order", () => {
    expect(Object.keys(lars)).toEqual([
      "name",
      "member_no",
      "born",
      "sex",
      "member_group",
      "email",
      "mobile",
      "member_type",
      "participation_type",
      "roles",
      "troop",
      "contact_info",
      "forms_data",
    ])
    expect(lars).toMatchObject({
      name: "Lars Lindberg",
      member_no: 1_100_101,
      born: "1995-07-16",
      sex: "Man",
      member_group: "Mockåsens scoutkår",
      mobile: "070-719 56 23",
      member_type: "Avdelningsledare",
      participation_type: "Rundresa",
      roles: ["wsj27:al:1"],
      troop: "1",
    })
  })

  it("carries the holes Scoutnet has – no mobile number, no scout group", () => {
    expect(decoded(1_100_402).mobile).toBeNull()
    expect(decoded(1_300_098).member_group).toBe("")
  })

  it("normalizes the travel package per member type, and gives the management none", () => {
    expect(decoded(1_300_098).participation_type).toBe("Egen resa")
    expect(decoded(1_300_140).participation_type).toBe("Direktresa")
    expect(decoded(1_200_401).participation_type).toBe("")
  })

  it("splits the contact tab out of forms_data, dropping the form and tab levels", () => {
    expect(lars.contact_info["Information redan i Scoutnet"]?.["nextOfKin1Name"]).toBe(
      "Johannes Norberg",
    )
    expect(lars.contact_info["Annan nödkontakt"]?.["emergencyContact1Name"]).toBe("Ylva Sandberg")
    expect(formsData(lars)["avdelningsledare_kontingentledning"]).not.toHaveProperty(
      "Grundläggande information",
    )
  })

  it("nests the rest form, tab, and section", () => {
    const health = formsData(lars)["avdelningsledare_kontingentledning"]?.["Hälsoinformation"]

    expect(health?.["Diet och födoämnesallergier"]?.["specialDiet"]).toBe("Vegan")
    expect(health?.["Vaccinationer"]?.["diphtheriaBoosterYear"]).toBe("2023")
  })

  it("carries an answer that picked several options as a list", () => {
    const otto = formsData(decoded(1_300_077))["deltagare_ist"]?.["Hälsoinformation"]

    expect(otto?.["Fysisk hälsa"]?.["mobilityAids"]).toEqual(["Kryckor", "Större tält"])
  })

  it("publishes the WSJ questions the deltagare and IST form carries", () => {
    const ester = formsData(decoded(1_300_035))["deltagare_ist"]?.["WSJ-relaterad information"]

    expect(ester?.["Förutsättningar för aktiviteter"]?.["canSwim200m"]).toBe("Ja")
    expect(ester?.["Erfarenheter"]?.["hasInternationalScoutingExperience"]).toBe("Nej")
  })

  it("leaves out every answer the template does not carry", () => {
    expect(JSON.stringify(lars)).not.toContain("languageEnglish")
    expect(JSON.stringify(lars)).not.toContain("travel")
    expect(JSON.stringify(decoded(1_200_401))).not.toContain("hasInternationalScoutingExperience")
  })

  it("gives the IST and the contingent management an empty troop", () => {
    expect(decoded(1_300_098)).toMatchObject({ member_type: "IST", troop: "" })
    expect(decoded(1_200_401)).toMatchObject({ member_type: "Kontingentledning", troop: "" })
  })

  it("mints each participant's roles once, from their fields and the roster", () => {
    expect(decoded(1_300_035).roles).toEqual([])
    expect(decoded(1_200_001).roles).toEqual(["wsj27:cmt:support:halsa"])
    expect(decoded(1_200_302).roles).toEqual(["wsj27:cmt:support:ist-support"])
    expect(decoded(1_200_301).roles).toEqual(["wsj27:cmt:support:avdelningssupport"])
    expect(decoded(1_200_102).roles).toEqual(["wsj27:cmt"])
  })

  it("holds the service's template question for question", () => {
    const questions = forms.flatMap((form) =>
      form.tabs.flatMap((tab) => tab.sections.flatMap((section) => section.questions)),
    )

    expect(questions).toHaveLength(136)
  })
})
