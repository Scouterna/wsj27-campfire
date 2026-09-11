import { describe, expect, it } from "vitest"

import { decodeJwt, encodeJwt, JwtError } from "./jwt.ts"
import { generateSigningKey } from "./keys.ts"

const key = generateSigningKey()
const now = Date.UTC(2027, 6, 30, 8)
const seconds = now / 1000

function check(claims: Record<string, unknown>): unknown {
  return decodeJwt(encodeJwt(claims, key), key, { now })
}

describe("tokens, as joserfc signs and checks them", () => {
  it("verifies its own tokens and hands back their claims", () => {
    const token = encodeJwt({ sub: "someone", exp: seconds + 60 }, key)

    expect(decodeJwt(token, key, { now })).toEqual({ sub: "someone", exp: seconds + 60 })
  })

  it("refuses a token signed by another key, and one whose signature was tampered with", () => {
    const other = generateSigningKey()
    const foreign = encodeJwt({ sub: "someone" }, other)
    expect(() => decodeJwt(foreign, key, { now })).toThrow(JwtError)

    const [header = "", , signature = ""] = encodeJwt({ sub: "someone" }, key).split(".", 3)
    const forged = `${header}.${Buffer.from('{"sub":"someone else"}').toString("base64url")}.${signature}`
    expect(() => decodeJwt(forged, key, { now })).toThrow(JwtError)
  })

  it("refuses anything that is not three segments of JSON objects", () => {
    expect(() => decodeJwt("a.b", key, { now })).toThrow(JwtError)
    expect(() => decodeJwt("a.b.c.d", key, { now })).toThrow(JwtError)
    expect(() => decodeJwt("not-json.e30.x", key, { now })).toThrow(JwtError)
    expect(() => decodeJwt("WzFd.e30.x", key, { now })).toThrow(JwtError)
  })

  it("allows thirty seconds of clock skew either way, and no more", () => {
    expect(() => check({ exp: seconds - 30 })).not.toThrow()
    expect(() => check({ exp: seconds - 31 })).toThrow(JwtError)
    expect(() => check({ nbf: seconds + 30 })).not.toThrow()
    expect(() => check({ nbf: seconds + 31 })).toThrow(JwtError)
    expect(() => check({ iat: seconds + 31 })).toThrow(JwtError)
    expect(() => check({ exp: "tomorrow" })).toThrow(JwtError)
  })

  it("holds a token to an issuer and an audience only when asked to", () => {
    const token = encodeJwt({ iss: "here", aud: ["wsj27", "other"] }, key)

    expect(() => decodeJwt(token, key, { audience: "wsj27", issuer: "here", now })).not.toThrow()
    expect(() => decodeJwt(token, key, { issuer: "elsewhere", now })).toThrow(JwtError)
    expect(() => decodeJwt(token, key, { audience: "someone-else", now })).toThrow(JwtError)
    expect(() =>
      decodeJwt(encodeJwt({ aud: "wsj27" }, key), key, { audience: "wsj27", now }),
    ).not.toThrow()
    expect(() => decodeJwt(encodeJwt({}, key), key, { audience: "wsj27", now })).toThrow(JwtError)
  })
})
