import { describe, expect, it } from "vitest"

import { dropPlSuffix, loadCmtRoles, rolesForParticipant, slug } from "./roles.ts"

describe("role segments", () => {
  it.each([
    ["Hälsa", "halsa"],
    ["FA/CET", "fa-cet"],
    ["  IST-support ", "ist-support"],
    ["Kommunikation & Media", "kommunikation-media"],
  ])("slugifies %j to %j", (label, segment) => {
    expect(slug(label)).toBe(segment)
  })

  it.each([
    ["Hälsa PL", "Hälsa"],
    ["IST-support PL", "IST-support"],
    ["Avdelningssupport PL", "Avdelningssupport"],
    ["Hälsa pl", "Hälsa"],
    ["Hälsa", "Hälsa"],
    ["Projektledare", "Projektledare"],
    ["PL Food house", "PL Food house"],
  ])("reads the Roll %j as %j", (roll, base) => {
    expect(dropPlSuffix(roll)).toBe(base)
  })
})

describe("the CMT roster", () => {
  it("keeps a row only with a member number that parses and a Funktion", () => {
    const csv = [
      "\u{FEFF}Medlemsnummer,Namn,Funktion,Roll",
      "1000001,A,Support,Hälsa",
      "1000002,B,Support,Hälsa PL",
      ",C,Program,",
      "x7,D,Program,",
      "1000005,E,,Medlem",
      "1000006,F,Admin,",
      "",
    ].join("\r\n")

    const details = loadCmtRoles(csv)

    expect(details.keys().toArray()).toEqual([1_000_001, 1_000_002, 1_000_006])
    expect(details.get(1_000_002)).toEqual(["support", "halsa"])
    expect(details.get(1_000_006)).toEqual(["admin", ""])
  })
})

describe("minting a participant's roles", () => {
  const roster = loadCmtRoles(
    "Medlemsnummer,Namn,Funktion,Roll\n1000001,A,Support,Hälsa PL\n1000002,B,Admin,\n",
  )

  it("gives a leader their troop, and nothing without one", () => {
    const leader = {
      accessLevel: "Ingen",
      memberNo: 1,
      memberType: "Avdelningsledare",
      troop: "18",
    }

    expect(rolesForParticipant(leader, roster)).toEqual(["wsj27:al:18"])
    expect(rolesForParticipant({ ...leader, troop: " " }, roster)).toEqual([])
  })

  it("gives the management their Funktion and Roll, falling back through the Funktion to plain management", () => {
    const member = {
      accessLevel: "",
      memberNo: 1_000_001,
      memberType: "Kontingentledning",
      troop: "",
    }

    expect(rolesForParticipant(member, roster)).toEqual(["wsj27:cmt:support:halsa"])
    expect(rolesForParticipant({ ...member, memberNo: 1_000_002 }, roster)).toEqual([
      "wsj27:cmt:admin",
    ])
    expect(rolesForParticipant({ ...member, memberNo: 9 }, roster)).toEqual(["wsj27:cmt"])
  })

  it("adds a personal grant as a role, but never for Ingen, and never to a deltagare", () => {
    const member = {
      accessLevel: "Hälsa plus intern information",
      memberNo: 9,
      memberType: "Kontingentledning",
      troop: "",
    }

    expect(rolesForParticipant(member, roster)).toEqual([
      "wsj27:cmt",
      "wsj27:access:Hälsa plus intern information",
    ])
    expect(rolesForParticipant({ ...member, accessLevel: "ingen" }, roster)).toEqual(["wsj27:cmt"])
    expect(rolesForParticipant({ ...member, memberType: "Deltagare" }, roster)).toEqual([])
  })
})
