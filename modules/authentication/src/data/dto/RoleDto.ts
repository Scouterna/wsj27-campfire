import type { Role } from "@scouterna/wsj27-campfire-utils"

/**
 * The converter for the auth service's role spellings, the flattened, colon-separated
 * strings the identity answer reports. It is ADR 019's adapter seam and the only place a
 * provider spelling is read, so everything above it asks with `Role` and a change in the
 * provider's shape is a change here alone.
 */

/**
 * The management functions a `wsj27:cmt:<funktion>` segment can name, and the role each
 * one grants on top of `cmt`.
 */
const managementFunctions = new Map<string, Role>([
  ["admin", { kind: "admin" }],
  // The roster spells the head of contingent "HoC", which the service slugs to "hoc",
  // and the longer spelling is accepted as an alias.
  ["hoc", { kind: "headOfContingent" }],
  ["kommunikation", { kind: "communication" }],
  ["kontingentledare", { kind: "headOfContingent" }],
  ["program", { kind: "program" }],
])

/**
 * The support function's subgroups, by the roll that names them, and the role each one
 * grants on top of `cmt` and `support`.
 */
const supportRolls = new Map<string, Role>([
  ["avdelningssupport", { kind: "unitSupport" }],
  ["halsa", { kind: "health" }],
  ["ist-support", { kind: "istSupport" }],
])

/**
 * The exact personal grant that unlocks health answers outside a support roll – a
 * Swedish sentence used as a role name, matching the project API's literal.
 */
const healthAccessLevel = "Hälsa plus intern information"

/**
 * The roles a `wsj27:al…` spelling grants – always a leader, of the unit its third
 * segment names when that segment reads as digits.
 * @param segments The spelling, already split on `:`.
 * @returns The leader role, with a unit number where one could be read.
 */
function leaderRoles(segments: readonly string[]): readonly Role[] {
  const unitSegment = segments[2]
  if (unitSegment !== undefined && /^\d+$/u.test(unitSegment)) {
    return [{ kind: "leader", unitNumber: Number(unitSegment) }]
  }
  // A leader role without a readable unit is still a leader – a data gap upstream, not a
  // reason to withhold the leader role itself.
  return [{ kind: "leader" }]
}

/**
 * The roles a `wsj27:cmt…` spelling grants – `cmt` itself, plus any management function
 * and support subgroup its deeper segments name.
 * @param segments The spelling, already split on `:`.
 * @returns `cmt` alone, or `cmt` and the function it names – for support, followed by
 * the subgroup where the roll names one.
 */
function cmtRoles(segments: readonly string[]): readonly Role[] {
  const funktion = segments[2]

  if (funktion === "support") {
    // A roll that names no subgroup – the funktionsansvariga, and specialsupport – is
    // still the support function, so it grants `support` alone.
    const roll = segments[3]
    const subgroup = roll === undefined ? undefined : supportRolls.get(roll)
    return subgroup === undefined
      ? [{ kind: "cmt" }, { kind: "support" }]
      : [{ kind: "cmt" }, { kind: "support" }, subgroup]
  }

  const managementRole = funktion === undefined ? undefined : managementFunctions.get(funktion)
  return managementRole === undefined ? [{ kind: "cmt" }] : [{ kind: "cmt" }, managementRole]
}

/**
 * Translates one provider spelling into the roles it grants.
 *
 * Compared segment by segment on `:`, never by string prefix, so `wsj27:cmtx` grants
 * nothing even though it starts with the same characters as `wsj27:cmt`.
 * @param spelling One role, exactly as the auth service spells it.
 * @returns The roles that spelling grants – empty for a spelling this converter does
 * not recognize.
 */
export function toRoles(spelling: string): readonly Role[] {
  const segments = spelling.split(":")

  if (segments[0] !== "wsj27") {
    return []
  }

  if (segments[1] === "al") {
    return leaderRoles(segments)
  }

  if (segments[1] === "cmt") {
    return cmtRoles(segments)
  }

  if (segments[1] === "access" && segments.length === 3 && segments[2] === healthAccessLevel) {
    return [{ kind: "health" }]
  }

  return []
}
