import { describe, expect, it } from "vitest"

import type { HealthProfile } from "../../model/HealthProfile"
import { toParticipantDetail } from "./ParticipantDetailDto"
import { toParticipant } from "./ParticipantDto"
import { diagnosisByLabel, dietByLabel, equipmentByLabel, mobilityAidByLabel } from "./answers"

/**
 * One person in full, as the participants service sends them: the basic block, the contact
 * answers split out for basic access, and the health answers nested form, tab, section the
 * way the registration form was laid out.
 */
function record(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "Lars Lindberg",
    member_no: 1_100_101,
    born: "1995-07-16",
    sex: "Man",
    member_group: "Mockåsens scoutkår",
    email: "lars.lindberg@example.se",
    mobile: "070-719 56 23",
    member_type: "Avdelningsledare",
    participation_type: "Rundresa",
    access_level: "",
    troop: "1",
    contact_info: {
      "Information redan i Scoutnet": {
        email: "lars@example.se",
        mobilePhone: "070-000 00 00",
        alternateEmail: "lars.privat@example.se",
        nextOfKin1Name: "Johannes Norberg",
        nextOfKin1Phone: "070-384 64 98",
        nextOfKin1Relation: "Förälder",
      },
      "Annan nödkontakt": {
        hasAlternateEmergencyContact: "Ja",
        emergencyContact1Name: "Ylva Sandberg",
        emergencyContact1Phone: "070-330 19 90",
        emergencyContact1Relation: "Partner",
      },
    },
    forms_data: {
      avdelningsledare_kontingentledning: {
        Hälsoinformation: {
          "Diet och födoämnesallergier": {
            specialDiet: "Vegan",
            hasFoodAllergy: "Ja",
            foodAllergyNuts: "4",
            foodAllergyDetails: "Nötter ger anafylaxi.",
          },
          Vaccinationer: {
            childhoodVaccinationsComplete: "Ja",
            diphtheriaBoosterAsAdult: "Ja",
            diphtheriaBoosterYear: "2023",
            tetanusBoosterAsAdult: "Nej",
          },
          "Fysisk hälsa": {
            usesPrescriptionMedication: "Ja",
            medicationDetails: "Levaxin, dagligen.",
            mobilityAids: ["Kryckor", "Större tält"],
          },
          "Psykisk hälsa": {
            cognitiveDiagnoses: ["ADHD", "ODC"],
            cognitiveDiagnosesDetails: "Behöver tydliga rutiner.",
          },
          "Övriga frågor": {
            additionalInfo: "Hör av er vid frågor.",
          },
        },
      },
    },
    ...overrides,
  }
}

/**
 * A deltagare, whose form publishes the WSJ tab the leader form has no counterpart for –
 * the readiness and experience answers, in the tab and sections the service nests them in.
 */
function deltagare(wsj: Record<string, unknown>): Record<string, unknown> {
  return record({
    name: "Vilgot Ek",
    member_no: 1_300_084,
    member_type: "Deltagare",
    troop: "3",
    contact_info: {},
    forms_data: { deltagare_ist: { "WSJ-relaterad information": wsj } },
  })
}

/**
 * Somebody whose diet section is the only thing they answered, for the allergy grades.
 * @param diet The answers that section carries.
 * @returns The record, with nothing else declared.
 */
function allergies(diet: Record<string, unknown>): Record<string, unknown> {
  return record({
    contact_info: {},
    forms_data: {
      avdelningsledare_kontingentledning: {
        Hälsoinformation: { "Diet och födoämnesallergier": diet },
      },
    },
  })
}

/**
 * The health profile of somebody who answered only what the case names.
 * @param answers The answers.
 * @returns The profile.
 */
function healthOf(answers: Record<string, unknown>): HealthProfile | undefined {
  return toParticipantDetail(allergies(answers))?.health
}

/**
 * A record whose only answer is one catch-all question, the leader's on the deltagare
 * form and the management's on the leader form.
 * @param key Which catch-all question.
 * @param text What was written in it.
 * @returns The record.
 */
function catchAll(
  key: "additionalInfo" | "additionalInfoUnitLeader",
  text: string,
): Record<string, unknown> {
  const form = key === "additionalInfo" ? "avdelningsledare_kontingentledning" : "deltagare_ist"
  return record({
    forms_data: { [form]: { Hälsoinformation: { "Övriga frågor": { [key]: text } } } },
  })
}

describe("reading one person in full", () => {
  it("keeps the listing row and reads the birth date", () => {
    const person = toParticipantDetail(record())

    expect(person?.memberNo).toBe("1100101")
    expect(person?.role).toBe("ledare")
    expect(person?.unit).toEqual({ name: "Björnen", number: 1 })
    expect(person?.birthDate).toBe("1995-07-16")
  })

  it("reads the contact answers, with Scoutnet's own email and phone winning", () => {
    const contact = toParticipantDetail(record())?.contact

    expect(contact?.email).toBe("lars.lindberg@example.se")
    expect(contact?.phone).toBe("070-719 56 23")
    expect(contact?.alternateEmail).toBe("lars.privat@example.se")
    expect(contact?.relatives).toEqual([
      { name: "Johannes Norberg", relation: "Förälder", phone: "070-384 64 98" },
    ])
    expect(contact?.emergencyContacts).toEqual([
      {
        name: "Ylva Sandberg",
        relation: "Partner",
        phone: "070-330 19 90",
        rank: "primary",
      },
    ])
  })

  it("falls back to the registration's copies when Scoutnet holds neither", () => {
    // The wire says null for a member without one, and the mock sends exactly that.
    const missing = JSON.parse('{"email": null, "mobile": null}') as Record<string, unknown>
    const contact = toParticipantDetail(record(missing))?.contact

    expect(contact?.email).toBe("lars@example.se")
    expect(contact?.phone).toBe("070-000 00 00")
  })

  it("reads the same number the listing row carries for the export", () => {
    // The sheet and the person's page read one number, whichever source it came from.
    // eslint-disable-next-line unicorn/no-null -- a missing mobile number is null on the wire
    for (const payload of [record(), record({ mobile: null })]) {
      const detail = toParticipantDetail(payload)

      expect(detail?.contact.phone).toBe(toParticipant(payload)?.phone)
    }
  })

  it("reads a missing mobile as empty, not as a crash", () => {
    // The wire says null for a member without one, and the mock sends exactly that.
    const noMobile = JSON.parse('{"mobile": null, "contact_info": {}}') as Record<string, unknown>

    expect(toParticipantDetail(record(noMobile))?.contact.phone).toBe("")
  })

  it("turns the Swedish answers into the health profile", () => {
    const health = toParticipantDetail(record())?.health

    expect(health?.diet).toEqual({ sort: "vegan" })
    expect(health?.foodAllergy).toEqual({
      severities: [{ allergen: "nuts", severity: 4 }],
      details: "Nötter ger anafylaxi.",
    })
    expect(health?.vaccinations).toEqual({
      childhoodProgram: true,
      diphtheria: { kind: "given", year: 2023 },
      tetanus: { kind: "notGiven" },
    })
    expect(health?.medication).toEqual({ details: "Levaxin, dagligen." })
    expect(health?.mobility).toEqual({ aids: ["crutches", "largerTent"] })
    // The form's own "ODC" typo lands on the same literal as the correct spelling.
    expect(health?.mind?.diagnoses).toEqual({
      kinds: ["adhd", "ocd"],
      details: "Behöver tydliga rutiner.",
    })
  })

  it("leaves out an allergen graded 1, which the scale reads as no allergy", () => {
    const health = toParticipantDetail(
      allergies({ hasFoodAllergy: "Ja", foodAllergyGluten: "1", foodAllergyNuts: "5" }),
    )?.health

    expect(health?.foodAllergy).toEqual({ severities: [{ allergen: "nuts", severity: 5 }] })
  })

  it("keeps a food allergy graded 1 across the board, with nothing graded", () => {
    // The fact that it was declared outlives the grades: the screens say so rather than
    // let a leader read the silence as no allergy at all.
    const health = toParticipantDetail(
      allergies({ hasFoodAllergy: "Ja", foodAllergyGluten: "1", foodAllergyLactose: "1" }),
    )?.health

    expect(health?.foodAllergy).toEqual({ severities: [] })
  })

  it("reads the free-text messages as notes with their audience", () => {
    expect(toParticipantDetail(record())?.notes).toEqual([
      { audience: "kontingentledningen", text: "Hör av er vid frågor." },
    ])
  })

  it.each(["additionalInfo", "additionalInfoUnitLeader"] as const)(
    "reads no note from %s where it only says there is nothing to add",
    (key) => {
      for (const nothing of ["Nej", "nej.", " Nej tack! ", "Inget", "-"]) {
        expect(toParticipantDetail(catchAll(key, nothing))?.notes).toEqual([])
      }
    },
  )

  it.each([
    ["additionalInfo", "kontingentledningen"],
    ["additionalInfoUnitLeader", "avdelningsledaren"],
  ] as const)("keeps a note in %s that starts with a no and goes on", (key, audience) => {
    expect(toParticipantDetail(catchAll(key, "Nej, men jag snarkar."))?.notes).toEqual([
      { audience, text: "Nej, men jag snarkar." },
    ])
  })

  it("leaves the health profile out when the service sent no forms_data", () => {
    // A basic fetch, or a viewer without health access – absence is the answer, and the
    // screens render nothing rather than a caveat.
    const person = toParticipantDetail(record({ forms_data: undefined }))

    expect(person).toBeDefined()
    expect(person?.health).toBeUndefined()
  })

  it("gives someone who answered nothing no profile, rather than an all-clear", () => {
    const person = toParticipantDetail(record({ forms_data: {}, contact_info: {} }))

    expect(person?.health).toBeUndefined()
    expect(person?.notes).toEqual([])
  })

  it("gives someone with answers but none about their health an empty profile", () => {
    const health = toParticipantDetail(allergies({ specialDiet: "Ingen specialkost" }))?.health

    expect(health?.vaccinations).toEqual({
      childhoodProgram: false,
      diphtheria: { kind: "unanswered" },
      tetanus: { kind: "unanswered" },
    })
  })

  it("reads the travel package the service normalized", () => {
    expect(toParticipantDetail(record())?.travel).toBe("rundresa")
    expect(toParticipantDetail(record({ participation_type: "Direktresa" }))?.travel).toBe(
      "direktresa",
    )
    expect(toParticipantDetail(record({ participation_type: "Egen resa" }))?.travel).toBe(
      "egenResa",
    )
  })

  it("leaves the travel out where the service carries none", () => {
    // The contingent management travels outside the packages, and the service sends
    // the empty string for them – absence, not a package nobody offers.
    expect(toParticipantDetail(record({ participation_type: "" }))?.travel).toBeUndefined()
    expect(toParticipantDetail(record({ participation_type: undefined }))?.travel).toBeUndefined()
    expect(toParticipantDetail(record({ participation_type: "Rymdfärja" }))?.travel).toBeUndefined()
  })

  it("reads the readiness and experience answers the WSJ tab carries", () => {
    const person = toParticipantDetail(
      deltagare({
        Erfarenheter: {
          hasInternationalScoutingExperience: "Ja",
          internationalScoutingExperienceDetails: "Var med på Jamboree17 hemma i Sverige.",
          hasIndependentTravelExperience: "Nej",
        },
        "Förutsättningar för aktiviteter": {
          canSwim200m: "Ja",
          comfortableInLargeCrowds: "Nej",
          activityPrerequisitesDetails: "Blir stressad i stora folkmassor.",
        },
      }),
    )

    expect(person?.readiness).toEqual({
      swims200m: true,
      comfortableInCrowds: false,
      clarification: "Blir stressad i stora folkmassor.",
    })
    expect(person?.experience).toEqual({
      internationalScouting: { has: true, details: "Var med på Jamboree17 hemma i Sverige." },
      independentTravel: { has: false },
    })
  })

  it("keeps a description out where its own yes-or-no was never answered", () => {
    const person = toParticipantDetail(
      deltagare({
        Erfarenheter: {
          hasIndependentTravelExperience: "Ja",
          independentTravelExperienceDetails: "Pendlar själv till skolan.",
        },
        "Förutsättningar för aktiviteter": { canSwim200m: "Ja" },
      }),
    )

    expect(person?.experience).toEqual({
      independentTravel: { has: true, details: "Pendlar själv till skolan." },
    })
    expect(person?.readiness).toEqual({ swims200m: true })
  })

  it("leaves the readiness and experience out where the questions were never put", () => {
    // The leader form has no WSJ tab at all, and a basic fetch carries no forms_data –
    // both are absence, which the screens draw the same way.
    const leader = toParticipantDetail(record())
    const basic = toParticipantDetail(record({ forms_data: undefined }))

    expect(leader?.readiness).toBeUndefined()
    expect(leader?.experience).toBeUndefined()
    expect(basic?.readiness).toBeUndefined()
    expect(basic?.experience).toBeUndefined()
  })

  it("leaves the languages and the ID-card name unset, as the template asks for neither", () => {
    const person = toParticipantDetail(record())

    expect(person?.languages).toBeUndefined()
    expect(person?.idCardName).toBeUndefined()
    expect(person?.funktion).toBeUndefined()
  })

  it("answers undefined for a payload that is not a person", () => {
    const refusal: Record<string, unknown> = { detail: "Participant not found in project." }

    expect(toParticipantDetail(refusal)).toBeUndefined()
  })
})

describe("reading the answers that declare something", () => {
  it("keeps Övriga ticked with a description and nothing graded, as reported", () => {
    const health = healthOf({
      hasFoodAllergy: "Ja",
      foodAllergyOther: "Ja",
      foodAllergyDetails: "Kiwi",
    })

    expect(health?.foodAllergy).toEqual({ details: "Kiwi", hasOther: true, severities: [] })
    expect(health).not.toHaveProperty("deniesFoodAllergy")
  })

  it("marks the participant form's Övriga no when it says no, and grades the leaders'", () => {
    const participants = healthOf({ hasFoodAllergy: "Ja", foodAllergyOther: "Nej" })
    const leaders = healthOf({ hasFoodAllergy: "Ja", foodAllergyOther: "4" })

    expect(participants?.foodAllergy).toEqual({ severities: [] })
    expect(leaders?.foodAllergy).toEqual({ severities: [{ allergen: "other", severity: 4 }] })
  })

  it.each([
    ["a grade", { hasFoodAllergy: "Nej", foodAllergyNuts: "5" }],
    ["a grade without a gate", { foodAllergyNuts: "2" }],
    ["Övriga", { hasFoodAllergy: "Nej", foodAllergyOther: "Ja" }],
    ["a description", { hasFoodAllergy: "Nej", foodAllergyDetails: "Kiwi" }],
  ])("lets %s win over the food allergy gate", (_, answers) => {
    const health = healthOf(answers)

    expect(health?.foodAllergy).toBeDefined()
    expect(health).not.toHaveProperty("deniesFoodAllergy")
  })

  it("reads a grade of 1 behind a closed gate as no allergy", () => {
    expect(healthOf({ hasFoodAllergy: "Nej", foodAllergyNuts: "1" })?.foodAllergy).toBeUndefined()
  })

  it("tells an explicit no to food allergies from a question never answered", () => {
    expect(healthOf({ hasFoodAllergy: "Nej" })?.deniesFoodAllergy).toBe(true)
    expect(healthOf({ specialDiet: "Vegan" })).not.toHaveProperty("deniesFoodAllergy")
  })

  it("keeps another allergy on a yes with nothing written, and on text behind a no", () => {
    expect(healthOf({ hasOtherAllergy: "Ja" })?.otherAllergy).toEqual({})
    expect(healthOf({ hasOtherAllergy: "Nej", otherAllergyDetails: "Bi" })?.otherAllergy).toEqual({
      details: "Bi",
    })
    expect(healthOf({ hasOtherAllergy: "Nej" })?.otherAllergy).toBeUndefined()
  })

  it("keeps a yes with nothing written for what the gate alone declares", () => {
    const health = healthOf({
      hasMedicalCondition: "Ja",
      hasMentalHealthCondition: "Ja",
      hasPhobia: "Ja",
      managesOwnMedication: "Nej",
      usesPrescriptionMedication: "Ja",
    })

    expect(health?.condition).toEqual({})
    expect(health?.medication).toEqual({ managesOwn: false })
    expect(health?.mind).toEqual({ condition: {}, phobia: {} })
  })

  it("leaves text behind a no out of what the gate alone declares", () => {
    const health = healthOf({
      hasMedicalCondition: "Nej",
      hasPhobia: "Nej",
      medicalConditionDetails: "Astma",
      phobiaDetails: "Getingar",
    })

    expect(health?.condition).toBeUndefined()
    expect(health?.mind).toBeUndefined()
  })

  it("keeps a diet the table does not know, with the label where no text stands", () => {
    expect(healthOf({ specialDiet: "Jain" })?.diet).toEqual({ details: "Jain", sort: "other" })
    expect(healthOf({ specialDiet: "Jain", specialDietDetails: "Inga rotfrukter" })?.diet).toEqual({
      details: "Inga rotfrukter",
      sort: "other",
    })
    expect(healthOf({ specialDiet: "Ingen specialkost" })?.diet).toBeUndefined()
  })

  it("tells an explicit no from a question never answered", () => {
    expect(healthOf({ specialDiet: "Ingen specialkost" })?.deniesDiet).toBe(true)
    expect(healthOf({ specialDiet: "Vegan" })).not.toHaveProperty("deniesDiet")
    expect(healthOf({ hasOtherAllergy: "Nej" })?.deniesOtherAllergy).toBe(true)
    expect(healthOf({ hasOtherAllergy: "Nej", otherAllergyDetails: "Pollen" })).not.toHaveProperty(
      "deniesOtherAllergy",
    )
    expect(healthOf({})).not.toHaveProperty("deniesDiet")
    expect(healthOf({})).not.toHaveProperty("deniesOtherAllergy")
  })

  it("calls the health questions answered only once every one of them is", () => {
    const answered = {
      hasMedicalCondition: "Nej",
      hasMentalHealthCondition: "Nej",
      hasPhobia: "Nej",
      hasPhysicalLimitations: "Nej",
      needsMedicalEquipment: "Nej",
      usesPrescriptionMedication: "Nej",
    }

    expect(healthOf(answered)?.isHealthAnswered).toBe(true)
    expect(healthOf({ ...answered, hasPhobia: "" })).not.toHaveProperty("isHealthAnswered")
  })

  it("keeps the options a multi-select's table does not know as the form words them", () => {
    const health = healthOf({
      cognitiveDiagnoses: ["ADHD", "Dyslexi"],
      medicalEquipmentNeeds: ["Syrgas"],
      mobilityAids: "Kryckor, Ståhjälp",
      needsMedicalEquipment: "Ja",
    })

    expect(health?.equipment).toEqual({ needs: [], unlisted: ["Syrgas"] })
    expect(health?.mobility).toEqual({ aids: ["crutches"], unlisted: ["Ståhjälp"] })
    expect(health?.mind?.diagnoses).toEqual({ kinds: ["adhd"], unlisted: ["Dyslexi"] })
  })

  it("raises a mobility need and a diagnosis on an unknown option alone", () => {
    const health = healthOf({ cognitiveDiagnoses: ["Dyslexi"], mobilityAids: ["Ståhjälp"] })

    expect(health?.mobility).toEqual({ aids: [], unlisted: ["Ståhjälp"] })
    expect(health?.mind?.diagnoses).toEqual({ kinds: [], unlisted: ["Dyslexi"] })
  })

  it("reads a plain no on a multi-select as no selection", () => {
    expect(healthOf({ cognitiveDiagnoses: "Nej", mobilityAids: ["Nej"] })?.mind).toBeUndefined()
    expect(healthOf({ mobilityAids: "Nej" })?.mobility).toBeUndefined()
  })
})

describe("the registration forms' own option labels", () => {
  // Copied from the two forms' question definitions, so a table that drifts from the forms
  // fails here rather than quietly dropping somebody's answer.
  const everyOption: readonly [string, ReadonlyMap<string, unknown>, readonly string[]][] = [
    [
      "special diet",
      dietByLabel,
      [
        "Vegetarian",
        "Vegan",
        "Halal",
        "Kosher",
        "Hindu - inget nötkött",
        "Hindu - inget kokött",
        "Annat",
      ],
    ],
    [
      "medical equipment",
      equipmentByLabel,
      [
        "Laddning av batteri för CPAP",
        "Permanent elförsörjning till medicinsk utrustning eller hjälpmedel",
        "Kylning av medicin",
        "Annat",
      ],
    ],
    [
      "mobility aids",
      mobilityAidByLabel,
      ["Käpp", "Kryckor", "Elektrisk rullstol", "Rullator", "Större tält", "Andra hjälpmedel"],
    ],
    [
      "diagnoses",
      diagnosisByLabel,
      [
        "ADD",
        "ADHD",
        "Autism",
        "Bipolär sjukdom",
        "Kognitiv funktionsnedsättning",
        "Neuropsykiatrisk funktionsnedsättning",
        "OCD",
        "ODC",
        "Annat",
      ],
    ],
  ]

  it.each(everyOption)("maps every %s option", (_, table, labels) => {
    expect(labels.filter((label) => !table.has(label))).toEqual([])
  })
})

describe("reading the funktion out of the minted roles", () => {
  it("places a management member by their funktion role", () => {
    expect(toParticipantDetail(record({ roles: ["wsj27:cmt:admin:medlem"] }))?.funktion).toBe(
      "administration",
    )
    expect(toParticipantDetail(record({ roles: ["wsj27:cmt:hoc:hoc"] }))?.funktion).toBe(
      "kontingentledare",
    )
  })

  it("splits the support function by its roll", () => {
    expect(toParticipantDetail(record({ roles: ["wsj27:cmt:support:halsa"] }))?.funktion).toBe(
      "halsosupport",
    )
    expect(
      toParticipantDetail(record({ roles: ["wsj27:cmt:support:ist-support"] }))?.funktion,
    ).toBe("istSupport")
  })

  it("places a support roll that names no subgroup in the support function itself", () => {
    for (const role of [
      "wsj27:cmt:support",
      "wsj27:cmt:support:fa",
      "wsj27:cmt:support:fa-cet",
      "wsj27:cmt:support:specialsupport",
    ]) {
      expect(toParticipantDetail(record({ roles: [role] }))?.funktion).toBe("support")
    }
  })

  it("reads no funktion from a plain cmt role, or from none at all", () => {
    expect(toParticipantDetail(record({ roles: ["wsj27:cmt"] }))?.funktion).toBeUndefined()
    expect(toParticipantDetail(record({ roles: [] }))?.funktion).toBeUndefined()
    expect(toParticipantDetail(record({}))?.funktion).toBeUndefined()
  })

  it("marks the funktionsansvarig, in both of the answer's spellings", () => {
    expect(
      toParticipantDetail(record({ roles: ["wsj27:cmt:program:fa"] }))?.isFunktionsansvarig,
    ).toBe(true)
    expect(
      toParticipantDetail(record({ roles: ["wsj27:cmt:admin:fa-cet"] }))?.isFunktionsansvarig,
    ).toBe(true)
    expect(
      toParticipantDetail(record({ roles: ["wsj27:cmt:support:fa"] }))?.isFunktionsansvarig,
    ).toBe(true)
    expect(
      toParticipantDetail(record({ roles: ["wsj27:cmt:support:specialsupport"] }))
        ?.isFunktionsansvarig,
    ).toBeUndefined()
    expect(
      toParticipantDetail(record({ roles: ["wsj27:cmt:admin:medlem"] }))?.isFunktionsansvarig,
    ).toBeUndefined()
  })

  it("never reads a funktion from a role outside the cmt namespace", () => {
    expect(toParticipantDetail(record({ roles: ["wsj27:al:2"] }))?.funktion).toBeUndefined()
    expect(toParticipantDetail(record({ roles: ["other:cmt:admin"] }))?.funktion).toBeUndefined()
  })
})
