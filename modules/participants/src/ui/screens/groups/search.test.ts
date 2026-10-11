import { describe, expect, it } from "vitest"

import { toGroupsSearch } from "./search"

describe("what filter the groups view's address carries", () => {
  it.each(["avdelningar", "cmt", "ist"])("reads the kind %s", (grupp) => {
    expect(toGroupsSearch({ grupp })).toStrictEqual({ grupp })
  })

  it.each([undefined, "", "units", "IST", 1])("drops %s as no kind", (grupp) => {
    expect(toGroupsSearch({ grupp })).toStrictEqual({})
  })
})
