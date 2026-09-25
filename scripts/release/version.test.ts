import { describe, expect, it } from "vitest"

import { bumpOf, compareVersions, formatVersion, nextVersion, parseVersion } from "./version.ts"

const released = { feature: 8, patch: 1, year: 2026 }

describe("the bump a commit subject earns", () => {
  it.each([
    ["feat: add a report", "feature"],
    ["fix: mend the list", "patch"],
    ["revert: undo the report", "patch"],
    ["docs: explain the list", "none"],
    ["feat!: replace the report", "feature"],
    ["refactor!: rename the module", "feature"],
    ["fix!: change what a fix returns", "feature"],
  ])("gives %j a %s bump", (subject, bump) => {
    expect(bumpOf(subject)).toBe(bump)
  })

  it.each([
    "feat(auth): sign in",
    "Merge branch 'main'",
    'Revert "feat: add a report"',
    "feat:no space",
    "",
    "feat",
  ])("gives nothing to the scoped or non-Conventional %j", (subject) => {
    expect(bumpOf(subject)).toBe("none")
  })
})

describe("the next version", () => {
  it("takes the largest bump among the subjects", () => {
    const subjects = ["fix: a", "feat: b", "docs: c"]

    expect(nextVersion({ last: released, subjects, year: 2026 })).toEqual({
      feature: 9,
      patch: 0,
      year: 2026,
    })
  })

  it("earns one patch for several fixes", () => {
    const subjects = ["fix: a", "revert: b", "fix: c"]

    expect(nextVersion({ last: released, subjects, year: 2026 })).toEqual({
      feature: 8,
      patch: 2,
      year: 2026,
    })
  })

  it("moves the feature segment and resets the patch within the same year", () => {
    expect(nextVersion({ last: released, subjects: ["feat: a"], year: 2026 })).toEqual({
      feature: 9,
      patch: 0,
      year: 2026,
    })
  })

  it("starts a new year at its first feature release", () => {
    expect(nextVersion({ last: released, subjects: ["feat: a"], year: 2027 })).toEqual({
      feature: 1,
      patch: 0,
      year: 2027,
    })
  })

  it("keeps a patch on the year of the feature it patches", () => {
    expect(nextVersion({ last: released, subjects: ["fix: a"], year: 2027 })).toEqual({
      feature: 8,
      patch: 2,
      year: 2026,
    })
  })

  it("starts a first release at the year's first feature release, whatever the bump", () => {
    expect(nextVersion({ last: undefined, subjects: ["fix: a"], year: 2026 })).toEqual({
      feature: 1,
      patch: 0,
      year: 2026,
    })
  })

  it("gives no version when nothing earns one", () => {
    expect(nextVersion({ last: undefined, subjects: ["docs: a"], year: 2026 })).toBeUndefined()
    expect(
      nextVersion({ last: released, subjects: ["chore: a", "feat(x): b"], year: 2026 }),
    ).toBeUndefined()
    expect(nextVersion({ last: released, subjects: [], year: 2026 })).toBeUndefined()
  })
})

describe("versions as text", () => {
  it("parses a version and formats it back to the same text", () => {
    expect(parseVersion("2026.8.1")).toEqual(released)
    expect(parseVersion("2026.0.0")).toEqual({ feature: 0, patch: 0, year: 2026 })
    expect(formatVersion(released)).toBe("2026.8.1")
    expect(formatVersion(parseVersion("2026.10.0") ?? released)).toBe("2026.10.0")
  })

  it.each([
    "2026.8",
    "v2026.8.1",
    "2026.08.x",
    "",
    "2026.8.1.0",
    "2026.-8.1",
    "-2026.8.1",
    "2026.08.1",
    " 2026.8.1",
  ])("rejects %j", (text) => {
    expect(parseVersion(text)).toBeUndefined()
  })
})

describe("the order of versions", () => {
  it("orders by feature numerically rather than as text", () => {
    const older = { feature: 9, patch: 0, year: 2026 }
    const newer = { feature: 10, patch: 0, year: 2026 }

    expect(compareVersions(newer, older)).toBeGreaterThan(0)
    expect(compareVersions(older, newer)).toBeLessThan(0)
  })

  it("lets the year dominate the feature, and the feature the patch", () => {
    expect(
      compareVersions({ feature: 1, patch: 0, year: 2027 }, { feature: 12, patch: 5, year: 2026 }),
    ).toBeGreaterThan(0)
    expect(
      compareVersions({ feature: 9, patch: 0, year: 2026 }, { feature: 8, patch: 7, year: 2026 }),
    ).toBeGreaterThan(0)
    expect(compareVersions(released, { feature: 8, patch: 2, year: 2026 })).toBeLessThan(0)
    expect(compareVersions(released, { ...released })).toBe(0)
  })

  it("sorts a set of versions oldest first", () => {
    const texts = ["2026.10.0", "2027.1.0", "2026.9.3", "2026.9.0"]
    const sorted = texts
      .flatMap((text) => parseVersion(text) ?? [])
      .toSorted(compareVersions)
      .map((version) => formatVersion(version))

    expect(sorted).toEqual(["2026.9.0", "2026.9.3", "2026.10.0", "2027.1.0"])
  })
})
