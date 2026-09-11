import { createHash } from "node:crypto"

import { describe, expect, it } from "vitest"

import { personas } from "../../seed/personas/index.ts"
import { clock } from "../testing/clock.ts"
import { InvalidGrant, ScoutId, type UpstreamTokens } from "./provider.ts"

const persona = personas.get("admin@wsj.se")!
const verifier = "a-verifier-long-enough-to-stand-for-one"
const request = {
  client_id: "wsj27-auth",
  code_challenge: createHash("sha256").update(verifier).digest("base64url"),
  code_challenge_method: "S256",
  redirect_uri: "http://localhost:8000/api/auth/callback",
  response_type: "code",
  state: "state-1",
}

function signedIn(scoutId: ScoutId): { code: string; location: URL; sessionId: string } {
  const outcome = scoutId.signIn(persona, request)
  if (outcome.kind !== "signed-in") {
    throw new Error(outcome.reason)
  }
  const location = new URL(outcome.location)
  return { code: location.searchParams.get("code") ?? "", location, sessionId: outcome.sessionId }
}

describe("the ScoutID stand-in", () => {
  it("refuses a client, a return address, or a response type it does not know", () => {
    const scoutId = new ScoutId(Date.now)

    expect(scoutId.authorize({ ...request, client_id: "other" }, undefined)).toEqual({
      kind: "refused",
      reason: "Client not found.",
    })
    expect(
      scoutId.authorize({ ...request, redirect_uri: "http://localhost:8000/x" }, undefined),
    ).toEqual({
      kind: "refused",
      reason: "Invalid parameter: redirect_uri",
    })
    expect(scoutId.signIn(persona, { ...request, response_type: "token" })).toEqual({
      kind: "refused",
      reason: "Invalid parameter: response_type",
    })
  })

  it("shows the picker to someone with no session, and answers a silent request with login_required", () => {
    const scoutId = new ScoutId(Date.now)

    expect(scoutId.authorize(request, undefined)).toEqual({ kind: "picker" })
    expect(scoutId.authorize({ ...request, prompt: "none" }, "no-such-session")).toEqual({
      kind: "redirect",
      location: `http://localhost:8000/api/auth/callback?${new URLSearchParams({
        error: "login_required",
        state: "state-1",
        iss: "http://localhost:8000/__mock__/scoutid",
      }).toString()}`,
    })
    const stateless = Object.fromEntries(
      Object.entries(request).filter(([name]) => name !== "state"),
    )
    const outcome = scoutId.authorize({ ...stateless, prompt: "none" }, undefined)
    expect(outcome.kind === "redirect" && new URL(outcome.location).searchParams.has("state")).toBe(
      false,
    )
  })

  it("signs a persona in, and redeems the code once for their identity", () => {
    const scoutId = new ScoutId(Date.now)
    const { code, location } = signedIn(scoutId)

    expect(location.searchParams.keys().toArray()).toEqual([
      "state",
      "session_state",
      "iss",
      "code",
    ])
    const tokens = scoutId.exchangeCode(code, verifier)
    expect(tokens.refresh_expires_in).toBe(1800)
    expect(scoutId.claimsOf(tokens.id_token)).toMatchObject({
      name: "Anna Almgren",
      preferred_username: "scoutnet|1200201",
      email: "admin@wsj.se",
      email_verified: true,
      scoutnet_member_no: "1200201",
    })
    expect(scoutId.claimsOf(tokens.access_token)["sub"]).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/u,
    )
    expect(scoutId.claimsOf("never-issued")).toEqual({})
    expect(() => scoutId.exchangeCode(code, verifier)).toThrow(InvalidGrant)
  })

  it("refuses a code after a minute, and a verifier that does not match its challenge", () => {
    const time = clock()
    const scoutId = new ScoutId(time.now)

    const late = signedIn(scoutId)
    time.advance(60_000)
    expect(() => scoutId.exchangeCode(late.code, verifier)).toThrow(InvalidGrant)

    const mismatched = signedIn(scoutId)
    expect(() => scoutId.exchangeCode(mismatched.code, "another-verifier")).toThrow(InvalidGrant)
  })

  it("goes straight back with a code while the session lives, until it idles out", () => {
    const time = clock()
    const scoutId = new ScoutId(time.now)
    const { sessionId } = signedIn(scoutId)

    expect(scoutId.authorize(request, sessionId).kind).toBe("redirect")
    expect(scoutId.activePersonas()).toEqual([persona])
    time.advance(30 * 60 * 1000)
    expect(scoutId.authorize(request, sessionId)).toEqual({ kind: "picker" })
    expect(scoutId.activePersonas()).toEqual([])
  })

  it("keeps a session alive through refreshes, but no longer than ten hours", () => {
    const time = clock()
    const scoutId = new ScoutId(time.now)
    let tokens: UpstreamTokens = scoutId.exchangeCode(signedIn(scoutId).code, verifier)

    for (let refreshes = 0; refreshes < 23; refreshes += 1) {
      time.advance(25 * 60 * 1000)
      tokens = scoutId.refresh(tokens.refresh_token)
    }
    // Nine hours and thirty-five minutes in, the refresh token lives only as long as the session.
    expect(tokens.refresh_expires_in).toBe(25 * 60)
    time.advance(25 * 60 * 1000)
    expect(() => scoutId.refresh(tokens.refresh_token)).toThrow(InvalidGrant)
  })

  it("refuses a refresh once the session has ended, and forgets everything on reset", () => {
    const scoutId = new ScoutId(Date.now)
    const { code, sessionId } = signedIn(scoutId)
    const tokens = scoutId.exchangeCode(code, verifier)

    expect(scoutId.endSession("never-issued")).toBe(false)
    expect(scoutId.endSession(undefined)).toBe(false)
    expect(scoutId.endSession(tokens.id_token)).toBe(true)
    expect(() => scoutId.refresh(tokens.refresh_token)).toThrow(InvalidGrant)

    const again = signedIn(scoutId)
    scoutId.reset()
    expect(scoutId.authorize(request, again.sessionId)).toEqual({ kind: "picker" })
    expect(() => scoutId.refresh("anything")).toThrow(InvalidGrant)
    expect(sessionId).not.toBe(again.sessionId)
  })
})
