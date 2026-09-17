import { Fragment } from "react"
import { describe, expect, it } from "vitest"

import { matchScreen, mountRoutes, type Routes, type ScreenSpec } from "./routes"

// The registry is the modules' to fill, so the table under test is spelled out and
// cast. The runtime match walks the entries and never reads the registry.
const spec = (tab: string): ScreenSpec => ({ Component: Fragment, tab })

const screens = {
  "/": spec("home"),
  "/participants": spec("participants"),
  "/participants/$id": spec("participants"),
} as Routes

describe("which screen a pathname names", () => {
  it("matches an address exactly", () => {
    expect(matchScreen("/participants", screens)?.spec.tab).toBe("participants")
    expect(matchScreen("/", screens)?.path).toBe("/")
  })

  it("matches a $param segment the way the router does", () => {
    expect(matchScreen("/participants/1100101", screens)?.path).toBe("/participants/$id")
  })

  it("refuses a path with a different segment count", () => {
    expect(matchScreen("/participants/1100101/health", screens)).toBeUndefined()
  })

  it("answers undefined for an address no screen claims", () => {
    expect(matchScreen("/nagon/annan", screens)).toBeUndefined()
  })

  it("prefers a literal segment over a parameter, whichever comes first in the table", () => {
    // The router resolves by specificity, so this has to as well: a chrome that named
    // one screen while the router mounted another would be worse than either answer.
    // Declared parameter-first on purpose – key order must not decide it.
    const withLiteral = {
      "/participants/$id": spec("participants"),
      "/participants/nya": spec("participants"),
    } as Routes

    expect(matchScreen("/participants/nya", withLiteral)?.path).toBe("/participants/nya")
    expect(matchScreen("/participants/1100101", withLiteral)?.path).toBe("/participants/$id")
  })
})

describe("mounting a table as routes", () => {
  it("keys the mounted routes by path, so each keeps its own type", () => {
    const mounted = mountRoutes(screens)

    // Keyed by path, not collapsed into an array: that is what keeps each route's own
    // literal type, and with it every checked `Link` in the product.
    expect(Object.keys(mounted)).toStrictEqual(["/", "/participants", "/participants/$id"])
    expect(mounted["/participants"]).toBeDefined()
  })

  it("mounts every screen's own component", () => {
    const mounted = mountRoutes(screens)

    expect(mounted["/"]?.options.component).toBe(Fragment)
  })

  it("mounts an empty table to an empty record", () => {
    expect(Object.keys(mountRoutes({}))).toHaveLength(0)
  })
})
