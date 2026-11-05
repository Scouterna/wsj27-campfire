import { describe, expect, it } from "vitest"

import { cmtRole, dropPlSuffix, rolesForParticipant, slug } from "./roles.ts"

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

describe("a management member's answer", () => {
  it.each([
    ["Support | Hälsa", "wsj27:cmt:support:halsa"],
    ["Support | Hälsa PL", "wsj27:cmt:support:halsa"],
    ["Support|Hälsa", "wsj27:cmt:support:halsa"],
    ["  Admin  |  FA/CET ", "wsj27:cmt:admin:fa-cet"],
    ["Kommunikation", "wsj27:cmt:kommunikation"],
    ["Kommunikation | ", "wsj27:cmt:kommunikation"],
    [" | Medlem", "wsj27:cmt"],
    ["", "wsj27:cmt"],
  ])("reads %j as %j", (answer, role) => {
    expect(cmtRole(answer)).toBe(role)
  })
})

describe("minting a participant's roles", () => {
  it("gives a leader their troop, and nothing without one", () => {
    const leader = {
      accessLevel: "Ingen",
      cmtRole: "",
      memberType: "Avdelningsledare",
      troop: "18",
    }

    expect(rolesForParticipant(leader)).toEqual(["wsj27:al:18"])
    expect(rolesForParticipant({ ...leader, troop: " " })).toEqual([])
  })

  it("gives the management the role their answer names", () => {
    const member = {
      accessLevel: "",
      cmtRole: "Support | Hälsa PL",
      memberType: "Kontingentledning",
      troop: "",
    }

    expect(rolesForParticipant(member)).toEqual(["wsj27:cmt:support:halsa"])
    expect(rolesForParticipant({ ...member, cmtRole: "" })).toEqual(["wsj27:cmt"])
  })

  it("adds a personal grant as a role, but never for Ingen, and never to a deltagare", () => {
    const member = {
      accessLevel: "Hälsa plus intern information",
      cmtRole: "",
      memberType: "Kontingentledning",
      troop: "",
    }

    expect(rolesForParticipant(member)).toEqual([
      "wsj27:cmt",
      "wsj27:legacy-access:Hälsa plus intern information",
    ])
    expect(rolesForParticipant({ ...member, accessLevel: "ingen" })).toEqual(["wsj27:cmt"])
    expect(rolesForParticipant({ ...member, memberType: "Deltagare" })).toEqual([])
  })
})
