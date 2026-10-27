import { describe, expect, it } from "vitest"

import { toCasesSearch } from "./search"

describe("reading the list the section's address opens on", () => {
  it("keeps a list it knows", () => {
    expect(toCasesSearch({ lista: "waiting" })).toEqual({ lista: "waiting" })
    expect(toCasesSearch({ lista: "closed" })).toEqual({ lista: "closed" })
  })

  it("drops anything else, which opens on the reader's own", () => {
    expect(toCasesSearch({ lista: "mine" })).toEqual({})
    expect(toCasesSearch({ lista: 3 })).toEqual({})
    expect(toCasesSearch({})).toEqual({})
  })
})
