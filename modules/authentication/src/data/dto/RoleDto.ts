import type { Role } from "@scouterna/wsj27-campfire-utils"

/**
 * The converter for the auth service's role spellings – the flattened, colon-separated
 * strings `/api/auth/user` reports. This file is ADR 019's adapter seam: the only place
 * a provider spelling is ever read. Everything above it asks with `Role` and the role
 * helpers, so swapping the provider's shape is this one table.
 */

/**
 * The management functions a `wsj27:cmt:<funktion>` segment can name, and the role each
 * one grants on top of `cmt`.
 */
const managementFunctions = new Map<string, Role>([
  ["admin", { kind: "admin" }],
  // The roster spells the head of contingent "HoC", which the service slugs to "hoc";
  // the longer spelling is kept as a tolerated alias from before the roster existed.
  ["hoc", { kind: "headOfContingent" }],
  ["kommunikation", { kind: "communication" }],
  ["kontingentledare", { kind: "headOfContingent" }],
  ["program", { kind: "program" }],
])

/**
 * The support function's rolls, and the role each one grants on top of `cmt`.
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
 * The roles a `wsj27:al…` spelling grants: always a leader, of the unit its third
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
 * The roles a `wsj27:cmt…` spelling grants: `cmt` itself, plus the management function
 * or support roll its deeper segments name, if any.
 * @param segments The spelling, already split on `:`.
 * @returns `cmt` alone, or `cmt` and the function or roll it names.
 */
function cmtRoles(segments: readonly string[]): readonly Role[] {
  const funktion = segments[2]

  if (funktion === "support") {
    const roll = segments[3]
    const supportRole = roll === undefined ? undefined : supportRolls.get(roll)
    return supportRole === undefined ? [{ kind: "cmt" }] : [{ kind: "cmt" }, supportRole]
  }

  const managementRole = funktion === undefined ? undefined : managementFunctions.get(funktion)
  return managementRole === undefined ? [{ kind: "cmt" }] : [{ kind: "cmt" }, managementRole]
}

/**
 * Translates one provider spelling into the roles it grants.
 *
 * Compared segment by segment on `:`, never by string prefix, so `wsj27:cmtx` grants
 * nothing even though it starts with the same characters as `wsj27:cmt`.
 * @param spelling One role, exactly as `/api/auth/user` spells it.
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
