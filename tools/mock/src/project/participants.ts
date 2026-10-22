import { Hono, type Context } from "hono"

import {
  intParsingError,
  literalError,
  parseInteger,
  refuseOtherMethods,
  validationFailed,
  type ValidationError,
} from "../fastapi.ts"
import type { SigningKey } from "../keys.ts"
import {
  hasAnyRole,
  hasRole,
  requireAuthUser,
  roleSuffixes,
  type AuthUser,
} from "./authentication.ts"
import type { ParticipantRecord, ParticipantsList } from "./participants-list.ts"
import { roleMap } from "./role-map.ts"

/**
 * What the project API's routes run against: the auth service's key, the clock, and the
 * list of participants.
 */
export interface ProjectDependencies {
  readonly key: SigningKey
  readonly now: () => number
  readonly participantsList: ParticipantsList
}

/**
 * How much of a record a caller asks for.
 */
export type InfoLevel = "basic" | "full" | "name"

// In declaration order, which is the order a refusal of an unknown level lists them in.
const infoLevels: readonly InfoLevel[] = ["name", "basic", "full"]

// Shorthands for the member-type listings.
const troopMapper: ReadonlyMap<string, string> = new Map([
  ["al", "Avdelningsledare"],
  ["cmt", "Kontingentledning"],
  ["ist", "IST"],
])

// Ordered, so `granted < required` is the whole check. A name costs what basic costs: someone
// with no access to a person must not be able to confirm they exist by asking for their name.
const noAccess = 0
const basicAccess = 1
const fullAccess = 2

// Whose name any leader or CMT member may read, wherever they are – the people who create, are
// assigned to, and write notes on cases. Only the name: every other level still follows the
// troop rules.
const adultMemberTypes: ReadonlySet<string> = new Set(["Avdelningsledare", "Kontingentledning"])

// Either one unlocks health answers: the Support function's health people, and the per-person
// grant from the Scoutnet form.
const healthRoles = ["wsj27:legacy-access:Hälsa plus intern information", "wsj27:cmt:support:halsa"]

/**
 * How much of a troop's participants a caller may see. A leader sees their own troop in full;
 * the contingent management sees everyone at basic, and in full with a health role. A member-type
 * listing, or a participant with no troop, is nobody's troop, so only the management rule
 * applies.
 * @param user The caller.
 * @param troop The troop, or undefined when there is none to own.
 * @returns 0 for no access, 1 for basic, 2 for full.
 */
export function troopAccess(user: AuthUser, troop: string | undefined): number {
  if (troop && roleSuffixes(user.roles, "wsj27:al").has(troop)) {
    return fullAccess
  }
  if (!hasRole(user.roles, "wsj27:cmt")) {
    return noAccess
  }
  return hasAnyRole(user.roles, healthRoles) ? fullAccess : basicAccess
}

/**
 * One record cut down to what a caller gets at a level. A leader's own contact and health
 * answers go only to the management with a health role – everyone else, their own troop's
 * leaders included, gets a leader's row without them – and are dropped rather than refused, so
 * one row cannot take a whole listing down.
 * @param record The decoded record.
 * @param infolevel The level asked for.
 * @param canSeeLeaderDetails Whether the caller may see a leader's own details.
 * @returns A new object in the record's key order.
 */
export function projectRecord(
  record: ParticipantRecord,
  infolevel: InfoLevel,
  canSeeLeaderDetails: boolean,
): Record<string, unknown> {
  if (infolevel === "name") {
    return { member_no: record.member_no, name: record.name }
  }
  const dropped = new Set(infolevel === "full" ? [] : ["forms_data"])
  if (!canSeeLeaderDetails && record.member_type === "Avdelningsledare") {
    dropped.add("contact_info")
    dropped.add("forms_data")
  }
  return Object.fromEntries(Object.entries(record).filter(([key]) => !dropped.has(key)))
}

function infolevelOf(context: Context): InfoLevel | ValidationError {
  const sent = context.req.query("infolevel") ?? "basic"
  return (
    infoLevels.find((level) => level === sent) ??
    literalError(["query", "infolevel"], sent, infoLevels)
  )
}

// No access answers 404 with the same body a missing record gets, so a refusal cannot reveal who
// exists; some access but not this much answers 403 rather than a quietly smaller 200. The member
// type is the participant's, or the listing's, where there is one, because an adult's name is
// open to every leader and CMT member, troop or not.
function refusal(
  context: Context,
  user: AuthUser,
  [troop, memberType]: readonly [troop: string | undefined, memberType: string | undefined],
  infolevel: InfoLevel,
  notFound: string,
): Response | undefined {
  let granted = troopAccess(user, troop)
  // Any troop at all, or CMT – not any project role, which a service account would pass.
  const isAdultName =
    infolevel === "name" && memberType !== undefined && adultMemberTypes.has(memberType)
  if (
    isAdultName &&
    (roleSuffixes(user.roles, "wsj27:al").size > 0 || hasRole(user.roles, "wsj27:cmt"))
  ) {
    granted = Math.max(granted, basicAccess)
  }
  if (granted === noAccess) {
    return context.json({ detail: notFound }, 404)
  }
  if (granted < (infolevel === "full" ? fullAccess : basicAccess)) {
    const detail = `Info level '${infolevel}' requires authorisation for health and internal information.`
    return context.json({ detail }, 403)
  }
  return undefined
}

function troopinfo(
  context: Context,
  { key, now, participantsList }: ProjectDependencies,
): Response {
  const user = requireAuthUser(context, key, now())
  if (user instanceof Response) {
    return user
  }
  const infolevel = infolevelOf(context)
  if (typeof infolevel !== "string") {
    return validationFailed(context, [infolevel])
  }
  const troopId =
    troopMapper.get(context.req.param("troopId") ?? "") ?? context.req.param("troopId") ?? ""
  const isNumbered = /^\d+$/u.test(troopId)
  // Authorized before the lookup, so an unauthorized caller gets the same answer whether or not
  // the troop exists.
  const refused = refusal(
    context,
    user,
    isNumbered ? [troopId, undefined] : [undefined, troopId],
    infolevel,
    "Troop not found in project.",
  )
  if (refused !== undefined) {
    return refused
  }
  const records = participantsList
    .values()
    .filter((record) =>
      isNumbered
        ? record.troop === troopId
        : troopId !== "Deltagare" && record.member_type === troopId,
    )
    .toArray()
  if (records.length === 0) {
    return context.json({ detail: "Troop not found in project." }, 404)
  }
  const canSeeLeaderDetails = troopAccess(user, undefined) === fullAccess
  return context.json(
    records.map((record) => projectRecord(record, infolevel, canSeeLeaderDetails)),
  )
}

function individual(
  context: Context,
  { key, now, participantsList }: ProjectDependencies,
): Response {
  const user = requireAuthUser(context, key, now())
  if (user instanceof Response) {
    return user
  }
  const errors: ValidationError[] = []
  const memberId = parseInteger(context.req.param("memberId") ?? "")
  if (memberId === undefined) {
    errors.push(intParsingError(["path", "member_id"], context.req.param("memberId") ?? ""))
  }
  const infolevel = infolevelOf(context)
  if (typeof infolevel !== "string") {
    errors.push(infolevel)
  }
  if (memberId === undefined || typeof infolevel !== "string") {
    return validationFailed(context, errors)
  }
  const record = participantsList.get(memberId)
  if (record === undefined) {
    return context.json({ detail: "Participant not found in project." }, 404)
  }
  // The person's own troop decides this, so unlike a listing the lookup comes first.
  const refused = refusal(
    context,
    user,
    [record.troop, record.member_type],
    infolevel,
    "Participant not found in project.",
  )
  if (refused !== undefined) {
    return refused
  }
  if (infolevel === "name") {
    return context.json({ name: record.name })
  }
  return context.json(projectRecord(record, infolevel, troopAccess(user, undefined) === fullAccess))
}

/**
 * The patrol a write asks for, as pydantic reads `PatrolUpdate`: a string, null, or no key
 * at all – anything else is a validation error, and so is a body that is not a JSON object.
 * @param body The request's body, as text.
 * @returns The patrol, or null for none, or the error to answer with.
 */
function patrolOf(body: string): string | null | ValidationError {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return {
      type: "json_invalid",
      loc: ["body", 0],
      msg: "JSON decode error",
      input: {},
      ctx: { error: "Expecting value" },
    }
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      type: "model_attributes_type",
      loc: ["body"],
      msg: "Input should be a valid dictionary or object to extract fields from",
      input: parsed,
    }
  }
  const patrol: unknown = "patrol" in parsed ? parsed.patrol : undefined
  if (patrol === undefined || patrol === null) {
    // eslint-disable-next-line unicorn/no-null -- PatrolUpdate's patrol defaults to None
    return null
  }
  if (typeof patrol !== "string") {
    return {
      type: "string_type",
      loc: ["body", "patrol"],
      msg: "Input should be a valid string",
      input: patrol,
    }
  }
  return patrol
}

/**
 * Sets or clears one deltagare's patrol, for a leader of their own troop alone – the
 * management included, since a patrol is the troop's own business. Anybody else, and anybody
 * who is not a deltagare, is answered as a person who does not exist. The empty string clears
 * it, as null does, and the answer is the member's number and their patrol after the write.
 * @param context The request being answered.
 * @param dependencies The key, the clock, and the list of participants written to.
 * @returns The response.
 */
async function setPatrol(context: Context, dependencies: ProjectDependencies): Promise<Response> {
  const { key, now, participantsList } = dependencies
  const user = requireAuthUser(context, key, now())
  if (user instanceof Response) {
    return user
  }
  const errors: ValidationError[] = []
  const memberId = parseInteger(context.req.param("memberId") ?? "")
  if (memberId === undefined) {
    errors.push(intParsingError(["path", "member_id"], context.req.param("memberId") ?? ""))
  }
  const patrol = patrolOf(await context.req.text())
  if (patrol !== null && typeof patrol !== "string") {
    errors.push(patrol)
  }
  if (memberId === undefined || (patrol !== null && typeof patrol !== "string")) {
    return validationFailed(context, errors)
  }
  const record = participantsList.get(memberId)
  // A leader is no deltagare and answers no Patrull, and the IST's patrols are filled in by
  // a job of their own.
  if (
    record?.member_type !== "Deltagare" ||
    record.troop === "" ||
    !roleSuffixes(user.roles, "wsj27:al").has(record.troop)
  ) {
    return context.json({ detail: "Participant not found in project." }, 404)
  }
  record.patrol = (patrol ?? "").trim()
  return context.json({ member_no: memberId, patrol: record.patrol })
}

/**
 * Builds `/participants`: one troop or member type at a time, one person, a person's patrol,
 * and the role map – each gated exactly as `participants.py` and `roles.py` gate them.
 * @param dependencies The auth service's key, the clock, and the list of participants.
 * @returns The routes, ready to be mounted at `/participants`.
 */
export function participantRoutes(dependencies: ProjectDependencies): Hono {
  const router = new Hono()
  router.get("/troopinfo/:troopId", (context) => troopinfo(context, dependencies))
  router.get("/individual/:memberId", (context) => individual(context, dependencies))
  router.post("/:memberId/patrol", async (context) => setPatrol(context, dependencies))
  router.get("/roles", (context) => {
    const user = requireAuthUser(context, dependencies.key, dependencies.now())
    return user instanceof Response ? user : roleMap(context, user, dependencies.participantsList)
  })
  for (const path of ["/troopinfo/:troopId", "/individual/:memberId", "/roles"]) {
    refuseOtherMethods(router, path, "GET")
  }
  refuseOtherMethods(router, "/:memberId/patrol", "POST")
  return router
}
