import { describe, expect, it } from "vitest"

import { addressSet, clipboardText, isMailable, mailLink, mailLinkLimit } from "./addresses"
import type { Participant } from "./Participant"

/**
 * One person in a list, overridable per case.
 */
function person(overrides: Partial<Participant> = {}): Participant {
  return {
    firstName: "Alva",
    lastName: "Ström",
    memberNo: "1100102",
    role: "deltagare",
    ...overrides,
  }
}

describe("gathering the addresses of a list", () => {
  it("keeps the list's order", () => {
    const people = [person({ email: "b@example.se" }), person({ email: "a@example.se" })]

    expect(addressSet(people, "people")).toEqual(["b@example.se", "a@example.se"])
  })

  it("skips whoever has no address", () => {
    const people = [person(), person({ email: "a@example.se" }), person({ email: "  " })]

    expect(addressSet(people, "people")).toEqual(["a@example.se"])
  })

  it("skips a value a mail client would not read as one recipient", () => {
    const people = [
      person({ email: "no-at-sign" }),
      person({ email: "a@example.se, b@example.se" }),
      person({ email: "a@example.se;b@example.se" }),
      person({ email: "Alva <a@example.se>" }),
      person({ email: "a b@example.se" }),
      person({ email: "a@b@example.se" }),
    ]

    expect(addressSet(people, "people")).toEqual([])
  })

  it("names a repeated address once, where it first appeared", () => {
    const people = [
      person({ email: "a@example.se" }),
      person({ email: "b@example.se" }),
      person({ email: "a@example.se" }),
    ]

    expect(addressSet(people, "people")).toEqual(["a@example.se", "b@example.se"])
  })

  it("counts two spellings as one address, and keeps the first", () => {
    const people = [person({ email: "Alva@Example.se" }), person({ email: " alva@example.se " })]

    expect(addressSet(people, "people")).toEqual(["Alva@Example.se"])
  })

  it("gathers the närstående's addresses, each person's first then second", () => {
    const people = [
      person({ relativeEmails: ["maria@example.se", "bjorn@example.se"] }),
      person(),
      person({ relativeEmails: ["eva@example.se"] }),
    ]

    expect(addressSet(people, "relatives")).toEqual([
      "maria@example.se",
      "bjorn@example.se",
      "eva@example.se",
    ])
  })

  it("names a parent of two siblings once", () => {
    const people = [
      person({ relativeEmails: ["maria@example.se"] }),
      person({ relativeEmails: ["maria@example.se", "bjorn@example.se"] }),
    ]

    expect(addressSet(people, "relatives")).toEqual(["maria@example.se", "bjorn@example.se"])
  })

  it("keeps the two kinds apart", () => {
    const people = [person({ email: "alva@example.se", relativeEmails: ["maria@example.se"] })]

    expect(addressSet(people, "people")).toEqual(["alva@example.se"])
    expect(addressSet(people, "relatives")).toEqual(["maria@example.se"])
  })

  it("answers an empty list with no addresses", () => {
    expect(addressSet([], "people")).toEqual([])
  })
})

describe("writing the mail link", () => {
  it("names every address as a hidden copy, and nobody any other way", () => {
    expect(mailLink(["a@example.se", "b@example.se"])).toBe("mailto:?bcc=a@example.se,b@example.se")
  })

  it("encodes what an address may hold and a link may not", () => {
    expect(mailLink(["maria.ström@example.se", "a+b&c@example.se"])).toBe(
      "mailto:?bcc=maria.str%C3%B6m@example.se,a%2Bb%26c@example.se",
    )
  })

  it("offers a link of exactly the limit, and not one character more", () => {
    expect(isMailable("m".repeat(mailLinkLimit))).toBe(true)
    expect(isMailable("m".repeat(mailLinkLimit + 1))).toBe(false)
  })

  it("can be measured against the limit to the character", () => {
    // "mailto:?bcc=" is twelve characters, so the address fills the rest exactly.
    const domain = "@example.se"
    const atTheLimit = `${"a".repeat(mailLinkLimit - 12 - domain.length)}${domain}`

    expect(mailLink([atTheLimit])).toHaveLength(mailLinkLimit)
    expect(mailLink([`a${atTheLimit}`])).toHaveLength(mailLinkLimit + 1)
  })
})

describe("writing the clipboard text", () => {
  it("separates the addresses as a recipient field reads them", () => {
    expect(clipboardText(["a@example.se", "b@example.se"])).toBe("a@example.se, b@example.se")
  })

  it("is never cut short", () => {
    const many = Array.from({ length: 2600 }, (_, index) => `scout${String(index)}@example.se`)

    expect(clipboardText(many).split(", ")).toHaveLength(2600)
  })
})
