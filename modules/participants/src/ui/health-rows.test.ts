import { describe, expect, it } from "vitest"

import { careOf } from "../model/Care"
import type { HealthProfile } from "../model/HealthProfile"
import { foodTexts, pageHealthRows, urgentHealthRows } from "./health-rows"

const vaccinations: HealthProfile["vaccinations"] = {
  childhoodProgram: true,
  diphtheria: { kind: "notGiven" },
  tetanus: { kind: "notGiven" },
}

const everything: HealthProfile = {
  condition: { details: "Astma" },
  equipment: { needs: ["refrigeration"] },
  medication: { details: "Insulin", managesOwn: true, storage: "Kylskåp" },
  mind: { phobia: { details: "Spindlar" } },
  mobility: { aids: ["crutches"] },
  support: { personalAssistant: true },
  vaccinations,
}

describe("the rows a health profile fills", () => {
  it("reads what they take and what they have first where it is urgent", () => {
    expect(urgentHealthRows(everything).map((row) => row.label)).toEqual([
      "Receptbelagda läkemedel",
      "Tar själv ansvar för medicinering",
      "Särskild förvaring",
      "Sjukdom",
      "Medicinsk utrustning",
      "Hjälpmedel",
      "Fobi",
      "Personlig assistent",
    ])
  })

  it("keeps the same rows on the person's page, in the page's own order", () => {
    expect(pageHealthRows(everything).map((row) => row.label)).toEqual([
      "Receptbelagda läkemedel",
      "Tar själv ansvar för medicinering",
      "Särskild förvaring",
      "Medicinsk utrustning",
      "Hjälpmedel",
      "Sjukdom",
      "Fobi",
      "Personlig assistent",
    ])
  })

  it("has something to show wherever the care says there is a health or support need", () => {
    for (const declared of [
      { condition: {} },
      { equipment: { needs: [] } },
      { medication: {} },
      { mind: { condition: {} } },
      { mind: { diagnoses: { kinds: [] } } },
      { mind: { phobia: {} } },
      { mobility: { aids: [] } },
      { support: { personalAssistant: true } },
      { support: { unpredictability: { wantsSupport: true } } },
    ]) {
      const health = { ...declared, vaccinations }

      expect(careOf(health, []).needs.length).toBeGreaterThan(0)
      expect(urgentHealthRows(health).length).toBeGreaterThan(0)
    }
  })

  it("has nothing to show, and raises nothing, for answers that say nothing", () => {
    for (const declared of [
      { mind: {} },
      { support: {} },
      { support: { personalAssistant: false } },
    ]) {
      const health = { ...declared, vaccinations }

      expect(careOf(health, []).needs).toEqual([])
      expect(urgentHealthRows(health)).toEqual([])
    }
  })
})

describe("the free texts about food", () => {
  it("labels each declared text with its question", () => {
    const texts = foodTexts({
      diet: { details: "Ingen fisk", sort: "vegetarian" },
      foodAllergy: { details: "Nötter", severities: [] },
      otherAllergy: { details: "Pollen" },
      vaccinations,
    })
    expect(texts).toEqual({
      allergy: { label: "Beskriv din allergi(er)", text: "Nötter" },
      diet: { label: "Beskriv din specialkost i detalj", text: "Ingen fisk" },
      otherAllergy: { label: "Allvarligare allergi (ej födoämne)", text: "Pollen" },
    })
  })

  it("keeps an undescribed allergy that is not to food, and nothing undeclared", () => {
    const texts = foodTexts({ otherAllergy: {}, vaccinations })
    expect(Object.keys(texts)).toEqual(["otherAllergy"])
    expect(texts.otherAllergy?.text).not.toBe("")
  })
})
