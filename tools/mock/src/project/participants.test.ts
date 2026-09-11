import { describe, expect, it } from "vitest"

import { createApp } from "../app.ts"
import { mintAccessToken } from "../auth/tokens.ts"
import { generateSigningKey } from "../keys.ts"
import { Browser, origin, signIn } from "../testing/browser.ts"
import { clock } from "../testing/clock.ts"
import type { AuthUser } from "./authentication.ts"
import { troopAccess } from "./participants.ts"

const key = generateSigningKey()
const app = createApp({ key })

interface WireRecord {
  contact_info?: Record<string, Record<string, unknown>>
  forms_data?: Record<string, unknown>
  member_no: number
  member_type: string
  name: string
  troop: string
}

async function tokenOf(
  mock: ReturnType<typeof createApp>,
  email: string,
  now?: () => number,
): Promise<string> {
  const browser = new Browser(mock, now)
  await signIn(browser, email)
  return browser.cookie("wsj27-auth_access-token") ?? ""
}

const tokens = new Map<string, string>()
for (const email of [
  "admin@wsj.se",
  "cmt@wsj.se",
  "health-grant@wsj.se",
  "health@wsj.se",
  "leader-1@wsj.se",
  "outsider@wsj.se",
  "program@wsj.se",
]) {
  tokens.set(email, await tokenOf(app, email))
}

function as(email: string): Record<string, string> {
  return { Cookie: `wsj27-auth_access-token=${tokens.get(email) ?? ""}` }
}

async function get(path: string, headers: Record<string, string> = {}): Promise<Response> {
  return app.request(`${origin}/api/project${path}`, { headers })
}

async function listing(path: string, email: string): Promise<WireRecord[]> {
  const response = await get(path, as(email))
  expect(response.status).toBe(200)
  return (await response.json()) as WireRecord[]
}

function caller(...roles: string[]): AuthUser {
  return {
    email: undefined,
    familyName: "",
    givenName: "",
    memberNo: "",
    name: "",
    preferredUsername: "",
    roles,
  }
}

describe("the access policy", () => {
  it.each([
    [["wsj27:al:18"], "18", 2],
    [["wsj27:al:18"], "19", 0],
    [["wsj27:al:18"], undefined, 0],
    [["wsj27:al:18", "wsj27:al:19"], "19", 2],
    [["wsj27:cmt:program:medlem"], "18", 1],
    [["wsj27:cmt"], undefined, 1],
    [["wsj27:cmt:support:halsa"], "18", 2],
    [["wsj27:cmt:program:medlem", "wsj27:access:Hälsa plus intern information"], "18", 2],
    [["wsj27:al:18", "wsj27:access:Hälsa plus intern information"], "19", 0],
    [["wsj27:al:18", "wsj27:cmt:program:medlem"], "19", 1],
    [["wsj27:al"], "18", 0],
    [["wsj27:alx:18"], "18", 0],
    [["wsj27:al:181"], "18", 0],
    [["wsj27:al:18"], "", 0],
    [["wsj27:cmtx"], "18", 0],
    [["wsj27:bulkread"], "18", 0],
    [[], "18", 0],
  ] as const)("grants %j over troop %j access %i", (roles, troop, expected) => {
    expect(troopAccess(caller(...roles), troop)).toBe(expected)
  })
})

describe("who is asking", () => {
  it("answers 401 without a token, and for one that does not verify", async () => {
    const nobody = await get("/participants/troopinfo/1")
    const garbage = await get("/participants/troopinfo/1", {
      Cookie: "wsj27-auth_access-token=abc.def.ghi",
    })
    const elsewhere = createApp({ key: generateSigningKey() })
    const foreignToken = await tokenOf(elsewhere, "admin@wsj.se")
    const foreign = await get("/participants/troopinfo/1", {
      Cookie: `wsj27-auth_access-token=${foreignToken}`,
    })

    for (const response of [nobody, garbage, foreign]) {
      expect(response.status).toBe(401)
      expect(await response.text()).toBe('{"detail":"Unauthorized"}')
    }
  })

  it("reads a bearer token when there is no cookie", async () => {
    const response = await get("/participants/troopinfo/1", {
      Authorization: `Bearer ${tokens.get("leader-1@wsj.se") ?? ""}`,
    })

    expect(response.status).toBe(200)
  })

  it("accepts a token for thirty seconds past its expiry, and refuses it after", async () => {
    const time = clock()
    const timed = createApp({ key, now: time.now })
    const token = await tokenOf(timed, "admin@wsj.se", time.now)
    const ask = async (): Promise<number> => {
      const response = await timed.request(`${origin}/api/project/participants/troopinfo/1`, {
        headers: { Cookie: `wsj27-auth_access-token=${token}` },
      })
      return response.status
    }

    time.advance(330_000)
    expect(await ask()).toBe(200)
    time.advance(1000)
    expect(await ask()).toBe(401)
  })

  it("refuses a signed-in caller with no project roles – 403, not 404", async () => {
    const response = await get("/participants/troopinfo/1", as("outsider@wsj.se"))

    expect(response.status).toBe(403)
    expect(await response.text()).toBe('{"detail":"No suitable roles"}')
  })
})

describe("the troop listing", () => {
  it("lists a leader their own troop – the young people in full, fellow leaders without their details", async () => {
    const rows = await listing("/participants/troopinfo/1?infolevel=full", "leader-1@wsj.se")

    expect(rows).toHaveLength(8)
    const leaders = rows.filter((row) => row.member_type === "Avdelningsledare")
    expect(leaders.map((row) => row.name)).toEqual(["Lars Lindberg", "Hanna Hellström"])
    expect(
      leaders.every((row) => row.contact_info === undefined && row.forms_data === undefined),
    ).toBe(true)
    const young = rows.filter((row) => row.member_type === "Deltagare")
    expect(
      young.every((row) => row.contact_info !== undefined && row.forms_data !== undefined),
    ).toBe(true)
  })

  it("refuses a leader another troop with 404, indistinguishable from no troop", async () => {
    const other = await get("/participants/troopinfo/2", as("leader-1@wsj.se"))
    const none = await get("/participants/troopinfo/9", as("leader-1@wsj.se"))

    expect(other.status).toBe(404)
    expect(await other.text()).toBe('{"detail":"Troop not found in project."}')
    expect(none.status).toBe(404)
  })

  it("lists the management any troop at basic, leaders' details withheld, and the member types by shorthand", async () => {
    const troop = await listing("/participants/troopinfo/1", "program@wsj.se")
    expect(
      troop
        .filter((row) => row.member_type === "Deltagare")
        .every((row) => row.contact_info !== undefined),
    ).toBe(true)
    expect(troop.every((row) => row.forms_data === undefined)).toBe(true)

    expect(await listing("/participants/troopinfo/2", "program@wsj.se")).toHaveLength(4)
    const leaders = await listing("/participants/troopinfo/al", "program@wsj.se")
    expect(leaders).toHaveLength(3)
    expect(leaders.every((row) => row.contact_info === undefined)).toBe(true)
    const ist = await listing("/participants/troopinfo/ist", "program@wsj.se")
    expect(ist.every((row) => row.member_type === "IST" && row.troop === "")).toBe(true)
    expect(await listing("/participants/troopinfo/cmt", "program@wsj.se")).toHaveLength(9)

    const deltagare = await get("/participants/troopinfo/Deltagare", as("program@wsj.se"))
    expect(deltagare.status).toBe(404)
  })

  it("refuses the management full without a health role – 403, not a quieter 200", async () => {
    for (const email of ["program@wsj.se", "cmt@wsj.se"]) {
      const response = await get("/participants/troopinfo/1?infolevel=full", as(email))
      expect(response.status).toBe(403)
      expect(await response.text()).toBe(
        `{"detail":"Info level 'full' requires authorisation for health and internal information."}`,
      )
    }
  })

  it("gives full, leaders' details included, to the health roll and to the personal grant alike", async () => {
    for (const email of ["health@wsj.se", "health-grant@wsj.se"]) {
      const rows = await listing("/participants/troopinfo/1?infolevel=full", email)
      expect(
        rows.every((row) => row.contact_info !== undefined && row.forms_data !== undefined),
      ).toBe(true)
    }
  })

  it("cuts the name level down to two keys, and refuses a level the service does not know", async () => {
    const names = await listing("/participants/troopinfo/1?infolevel=name", "program@wsj.se")
    expect(names.every((row) => Object.keys(row).join(",") === "member_no,name")).toBe(true)

    const unknown = await get("/participants/troopinfo/1?infolevel=xyz", as("program@wsj.se"))
    expect(unknown.status).toBe(422)
    expect(await unknown.text()).toBe(
      `{"detail":[{"type":"literal_error","loc":["query","infolevel"],"msg":"Input should be 'name', 'basic' or 'full'","input":"xyz","ctx":{"expected":"'name', 'basic' or 'full'"}}]}`,
    )
  })
})

describe("one participant", () => {
  it("serves a leader their troop's deltagare in full, and their own record without their details", async () => {
    const esterResponse = await get(
      "/participants/individual/1300035?infolevel=full",
      as("leader-1@wsj.se"),
    )
    const ester = (await esterResponse.json()) as WireRecord
    expect(ester.forms_data).toBeDefined()
    expect(ester.contact_info).toBeDefined()

    const ownResponse = await get(
      "/participants/individual/1100101?infolevel=full",
      as("leader-1@wsj.se"),
    )
    const own = (await ownResponse.json()) as WireRecord
    expect(own.name).toBe("Lars Lindberg")
    expect(own.contact_info).toBeUndefined()
    expect(own.forms_data).toBeUndefined()
  })

  it("answers 404 outside the caller's scope, with a stranger's body", async () => {
    const outside = await get("/participants/individual/1300140", as("leader-1@wsj.se"))
    const stranger = await get("/participants/individual/9999999", as("leader-1@wsj.se"))

    expect(outside.status).toBe(404)
    expect(await outside.text()).toBe('{"detail":"Participant not found in project."}')
    expect(await stranger.text()).toBe('{"detail":"Participant not found in project."}')
  })

  it("answers the name level with the name alone – the number is not news", async () => {
    const ester = String(1_300_035)
    const response = await get(
      `/participants/individual/${ester}?infolevel=name`,
      as("leader-1@wsj.se"),
    )

    expect(await response.text()).toBe('{"name":"Ester Dahl"}')
  })

  it("collects a bad member number and a bad level into one refusal", async () => {
    const response = await get("/participants/individual/abc?infolevel=xyz", as("admin@wsj.se"))

    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({
      detail: [
        { type: "int_parsing", loc: ["path", "member_id"], input: "abc" },
        { type: "literal_error", loc: ["query", "infolevel"], input: "xyz" },
      ],
    })
  })
})

describe("the role map", () => {
  it("serves every role-holder's roles to the administration, sorted and hashed as the service hashes them", async () => {
    const response = await get("/participants/roles", as("admin@wsj.se"))
    const text = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get("ETag")).toMatch(/^"[\da-f]{32}"$/u)
    expect(
      text.startsWith('{"participants": {"1100101": ["wsj27:al:1"], "1100201": ["wsj27:al:2"], '),
    ).toBe(true)
    const { participants } = JSON.parse(text) as { participants: Record<string, string[]> }
    expect(Object.keys(participants)).toHaveLength(12)
    expect(participants["1200002"]).toEqual([
      "wsj27:cmt:support",
      "wsj27:access:Hälsa plus intern information",
    ])
    expect(participants["1200101"]).toEqual([
      "wsj27:cmt:program:medlem",
      "wsj27:access:Intern information",
    ])
    expect(participants["1200102"]).toEqual(["wsj27:cmt"])
    expect(participants["1200302"]).toEqual(["wsj27:cmt:support:ist-support"])
    expect(participants["1300035"]).toBeUndefined()
  })

  it("answers 304 when the caller already holds the map", async () => {
    const first = await get("/participants/roles", as("admin@wsj.se"))
    const etag = first.headers.get("ETag") ?? ""

    for (const sent of [etag, `W/${etag}`, `"other", ${etag}`]) {
      const response = await get("/participants/roles", {
        ...as("admin@wsj.se"),
        "If-None-Match": sent,
      })
      expect(response.status).toBe(304)
      expect(response.headers.get("ETag")).toBe(etag)
      expect(await response.text()).toBe("")
    }
    const changed = await get("/participants/roles", {
      ...as("admin@wsj.se"),
      "If-None-Match": '"other"',
    })
    expect(changed.status).toBe(200)
  })

  it("serves the auth service's own service token, and hides the map from everyone else", async () => {
    const service = mintAccessToken(
      { sub: "service-account-wsj27-auth" },
      ["wsj27:bulkread"],
      undefined,
      key,
      Date.now(),
    )
    const served = await get("/participants/roles", { Authorization: `Bearer ${service.token}` })
    const hidden = await get("/participants/roles", as("leader-1@wsj.se"))

    expect(served.status).toBe(200)
    expect(hidden.status).toBe(404)
    expect(await hidden.text()).toBe('{"detail":"Not Found"}')
  })
})

describe("the Scoutnet refresh", () => {
  it("answers a signed-in caller as the service does once Scoutnet has answered, and refuses anyone else", async () => {
    const refreshed = await get("/scoutnet/refresh", as("program@wsj.se"))
    const refused = await get("/scoutnet/refresh")

    expect(await refreshed.text()).toBe("null")
    expect(refused.status).toBe(401)
  })
})
