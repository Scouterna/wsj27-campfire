import { describe, expect, it } from "vitest"

import { toFoodSearch, toggled } from "./search"

describe("the overview's address", () => {
  it("keeps the well-formed row keys", () => {
    expect(
      toFoodSearch({ open: ["allergen-nuts:1300035", "diet-other:1300147", "ungraded:1300287"] }),
    ).toEqual({ open: ["allergen-nuts:1300035", "diet-other:1300147", "ungraded:1300287"] })
  })

  it("drops junk, a key given twice, and an empty list", () => {
    expect(
      toFoodSearch({ open: ["allergen-nuts:1300035", "allergen-nuts:1300035", 7, "nuts", ""] }),
    ).toEqual({ open: ["allergen-nuts:1300035"] })
    expect(toFoodSearch({ open: "allergen-nuts:1300035" })).toEqual({})
    expect(toFoodSearch({ open: [] })).toEqual({})
    expect(toFoodSearch({})).toEqual({})
  })
})

describe("toggling a row", () => {
  it("opens one row and closes it again, leaving the same person's other rows alone", () => {
    const opened = toggled(["allergen-egg:1300035"], "allergen-nuts:1300035")

    expect(opened).toEqual({ open: ["allergen-egg:1300035", "allergen-nuts:1300035"] })
    expect(toggled(opened.open ?? [], "allergen-egg:1300035")).toEqual({
      open: ["allergen-nuts:1300035"],
    })
    expect(toggled(["ungraded:1300287"], "ungraded:1300287")).toEqual({})
  })
})
