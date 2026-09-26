import type { ParticipantDetail } from "../../../model/ParticipantDetail"

/**
 * The people this screen's stories are told about. They live here rather than in the
 * module's shared fixtures because they exist to exercise this screen's sections: one
 * record that fills every one of them, one read without health access, and one with a hole
 * wherever the registration allowed one.
 */

/**
 * A leader who answered everything: every section has something to draw, including the
 * ID-card name and the languages, which the participants service does not publish.
 */
export const complete: ParticipantDetail = {
  memberNo: "1100101",
  firstName: "Anna",
  lastName: "Björk",
  role: "ledare",
  unitNumber: 3,
  birthDate: "1987-04-12",
  travel: "rundresa",
  memberGroup: "Mockåsens scoutkår",
  idCardName: "Anna Maria Björk",
  contact: {
    email: "anna.bjork@example.se",
    phone: "070-123 45 67",
    alternateEmail: "anna.privat@example.se",
    relatives: [
      {
        name: "Johannes Norberg",
        relation: "Partner",
        phone: "070-384 64 98",
        email: "johannes.norberg@example.se",
      },
      { name: "Ingrid Björk", relation: "Förälder", phone: "070-221 08 14" },
    ],
    emergencyContacts: [
      {
        name: "Ylva Sandberg",
        relation: "Syster",
        phone: "070-330 19 90",
        rank: "primary",
      },
      {
        name: "Per Sandberg",
        relation: "Svåger",
        email: "per.sandberg@example.se",
        rank: "secondary",
      },
    ],
  },
  health: {
    diet: { sort: "vegan", details: "Äter inga animaliska produkter alls." },
    foodAllergy: {
      severities: [
        { allergen: "nuts", severity: 5 },
        { allergen: "sesame", severity: 4 },
        { allergen: "lactose", severity: 2 },
      ],
      details: "Nötter ger anafylaxi – bär alltid med sig adrenalinpenna.",
    },
    otherAllergy: "Björkpollen på våren.",
    vaccinations: {
      childhoodProgram: true,
      diphtheria: { kind: "given", year: 2023 },
      tetanus: { kind: "notGiven" },
    },
    medication: {
      details: "Levaxin 100 µg, varje morgon.",
      storage: "Kylförvaring mellan måltiderna.",
      managesOwn: true,
    },
    condition: "Astma, välinställd.",
    equipment: {
      needs: ["refrigeration", "permanentPower"],
      details: "Insulinpennorna behöver stå kallt.",
    },
    mobility: {
      aids: ["crutches"],
      limitations: "Klarar inte långa vandringar efter en knäoperation i våras.",
    },
    mind: {
      diagnoses: {
        kinds: ["adhd", "ocd"],
        details: "Behöver tydliga rutiner och framförhållning.",
      },
      phobia: "Höga höjder.",
    },
    support: {
      unpredictability: { wantsSupport: true, details: "Oregelbundna måltider blir jobbiga." },
    },
  },
  languages: [
    { language: "english", level: 5 },
    { language: "french", level: 3 },
    { language: "polish", level: 1 },
  ],
  readiness: {
    swims200m: true,
    comfortableInCrowds: false,
    clarification: "Blir stressad i stora folkmassor och behöver kunna kliva undan en stund.",
  },
  experience: {
    internationalScouting: { has: true, details: "Var med på Jamboree17 hemma i Sverige." },
    independentTravel: { has: false },
  },
  notes: [
    { audience: "avdelningsledaren", text: "Vill gärna dela tält med någon från samma kår." },
    {
      audience: "kontingentledningen",
      text: "Hör av er om ni behöver veta mer om medicineringen.",
    },
  ],
}

/**
 * A person read without health access: everything the basic level carries, and nothing
 * the health level does. The sections that have nothing to say are not drawn, and
 * nothing on the screen says why.
 */
export const withoutHealth: ParticipantDetail = {
  memberNo: "1300084",
  firstName: "Vilgot",
  lastName: "Ek",
  role: "deltagare",
  unitNumber: 3,
  birthDate: "2011-09-02",
  travel: "direktresa",
  contact: {
    email: "vilgot.ek@example.se",
    phone: "070-556 12 03",
    relatives: [{ name: "Karin Ek", relation: "Vårdnadshavare", phone: "070-118 92 70" }],
    emergencyContacts: [],
  },
  notes: [],
}

/**
 * A hole wherever the registration allowed one: no channels, no travel, one contact with
 * no way to reach them, and a health profile that says nothing at all. Every absent state
 * on the screen is visible at once.
 */
export const sparse: ParticipantDetail = {
  memberNo: "1400012",
  firstName: "Elsa",
  lastName: "Nyström",
  role: "ist",
  birthDate: "2003-12-30",
  contact: {
    email: "",
    phone: "",
    relatives: [{ name: "Bo Nyström" }],
    emergencyContacts: [],
  },
  health: {
    vaccinations: {
      childhoodProgram: false,
      diphtheria: { kind: "unanswered" },
      tetanus: { kind: "unanswered" },
    },
  },
  notes: [],
}

/**
 * What the stories seed the query cache with, so opening any of them answers from
 * memory rather than from a network Storybook does not have.
 */
export const details: readonly ParticipantDetail[] = [complete, sparse, withoutHealth]
