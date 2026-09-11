import { Hono } from "hono"
import { describe, expect, it } from "vitest"

import { cookieHeader, parseInteger, readCookie } from "./fastapi.ts"

const attributes = { httpOnly: true, maxAge: 300, path: "/", secure: false }

describe("cookies, as Python writes and reads them", () => {
  it("writes a value of legal characters as it is", () => {
    expect(cookieHeader("a", "abc.DEF-123", attributes)).toBe(
      "a=abc.DEF-123; HttpOnly; Max-Age=300; Path=/; SameSite=lax",
    )
  })

  it("quotes any other value the way http.cookies does", () => {
    expect(cookieHeader("a", "http://localhost:8000/home", attributes)).toBe(
      'a="http://localhost:8000/home"; HttpOnly; Max-Age=300; Path=/; SameSite=lax',
    )
    expect(
      cookieHeader("a", String.raw`x;y,z"\ä`, { ...attributes, httpOnly: false, secure: true }),
    ).toBe(String.raw`a="x\073y\054z\"\\\344"; Max-Age=300; Path=/; SameSite=lax; Secure`)
  })

  it("writes a deletion with an expires date and an empty quoted value", () => {
    const deletion = { ...attributes, expires: Date.UTC(2027, 6, 30, 8), maxAge: 0 }
    expect(cookieHeader("a", "", deletion)).toBe(
      'a=""; expires=Fri, 30 Jul 2027 08:00:00 GMT; HttpOnly; Max-Age=0; Path=/; SameSite=lax',
    )
  })

  it("reads a cookie the way Starlette parses them – the last of a name wins, and quotes come off", async () => {
    const app = new Hono().get("/", (context) =>
      context.json({
        a: readCookie(context, "a") ?? "absent",
        b: readCookie(context, "b") ?? "absent",
        c: readCookie(context, "c") ?? "absent",
        d: readCookie(context, "d") ?? "absent",
      }),
    )
    const cookie = String.raw`a=1; flag; b="x\073y\"z"; a=2; c=`

    const response = await app.request("/", { headers: { Cookie: cookie } })

    expect(await response.json()).toEqual({ a: "2", b: 'x;y"z', c: "", d: "absent" })
  })
})

describe("integers, as pydantic reads them from a string", () => {
  it("allows surrounding whitespace and a sign, and nothing else", () => {
    expect(parseInteger(" 42 ")).toBe(42)
    expect(parseInteger("+7")).toBe(7)
    expect(parseInteger("1.0")).toBeUndefined()
    expect(parseInteger("abc")).toBeUndefined()
  })
})
