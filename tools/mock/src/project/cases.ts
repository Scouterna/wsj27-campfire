import { Hono, type Context } from "hono"

import { notFound } from "../fastapi.ts"
import {
  answer,
  bodyField,
  boundedInteger,
  detail,
  invalid,
  isTrue,
  listOf,
  modelOf,
  pathInteger,
  queryField,
  toDatetime,
  toInteger,
  toNonEmptyText,
  toNullableInteger,
  toText,
  type FieldError,
  type Validator,
} from "../pydantic.ts"
import type { PyValue } from "../python.ts"
import {
  canReach,
  canReadNote,
  caseTypes,
  hasCaseRole,
  isRoleHolder,
  membersWithAccess,
  typesFor,
  type Person,
} from "./case-access.ts"
import {
  guarded,
  solveCase,
  storable,
  type Handler,
  type Route,
  type Service,
} from "./case-dependencies.ts"
import { caseJson, newestFirst, noteJson, seededStore, type CaseRecord } from "./case-store.ts"
import type { ProjectDependencies } from "./participants.ts"

/**
 * The cases service, as `case.py` runs it over its database: cases about a person or a troop,
 * each with its notes, reached by the roles its type names and by its `extra_access`, and
 * frozen while closed.
 */

const secrecy = boundedInteger(1, 5)
const integers = listOf(toInteger)
const texts = listOf(toText)

// The route's own `case_id`, refused a second time beside the dependency's.
function routeCaseId(context: Context, errors: FieldError[]): void {
  pathInteger(context, "caseId", "case_id", errors)
}

function refuseExtraAccess(
  context: Context,
  secrecyLevel: number,
  extraAccess: readonly bigint[],
): Response | undefined {
  if (secrecyLevel === 4 && extraAccess.length > 0) {
    return detail(context, "A secrecy level 4 case cannot have extra_access", 422)
  }
  return undefined
}

function onlyRoleHolders(context: Context): Response {
  return detail(context, "Only the case type's own roles may do this", 403)
}

// The participants dictionary is keyed by member number, so a number past what it can hold is
// simply nobody.
function participantOf(
  { participantsList }: Service,
  memberNo: bigint,
): { readonly troop: string } | undefined {
  return memberNo <= BigInt(Number.MAX_SAFE_INTEGER) && memberNo >= 0n
    ? participantsList.get(Number(memberNo))
    : undefined
}

function createCase(service: Service, context: Context, caller: Person, body: PyValue): Response {
  const errors: FieldError[] = []
  const fields = modelOf(body, errors)
  if (fields === undefined) {
    return invalid(context, errors)
  }
  const secrecyLevel = Number(bodyField(fields, "secrecy_level", errors, secrecy, false) ?? 3n)
  const title = bodyField(fields, "title", errors, toText, true) ?? ""
  const type = bodyField(fields, "type", errors, toText, true) ?? ""
  const aboutPersonId = bodyField(fields, "about_person_id", errors, toNullableInteger, false)
  const troop = bodyField(fields, "troop", errors, toText, true) ?? ""
  const extraAccess = bodyField(fields, "extra_access", errors, integers, false) ?? []
  const tags = bodyField(fields, "tags", errors, texts, false) ?? []
  if (errors.length > 0) {
    return invalid(context, errors)
  }
  if (!caseTypes.has(type)) {
    return detail(context, `Invalid case type: ${type}`, 422)
  }
  if (!hasCaseRole(caller, type, troop)) {
    return detail(context, `No access to ${type} cases for ${troop}`, 403)
  }
  // The same answer for someone missing and someone in another troop, so a leader cannot use it
  // to find out who is in the contingent.
  const isOutsideTroop =
    type === "avdelning" &&
    aboutPersonId !== undefined &&
    participantOf(service, aboutPersonId)?.troop !== troop
  if (isOutsideTroop) {
    return detail(context, `Member ${String(aboutPersonId)} is not in troop ${troop}`, 422)
  }
  if (secrecyLevel < 3) {
    return detail(context, "Secrecy levels 1 and 2 are not in use yet", 422)
  }
  const refused = refuseExtraAccess(context, secrecyLevel, extraAccess)
  if (refused !== undefined) {
    return refused
  }
  const creatorId = caller.userId()
  storable(creatorId, title, type, aboutPersonId, troop, extraAccess, tags)
  const record = service.store.addCase({
    aboutPersonId,
    assignedToId: undefined,
    createdAt: service.now(),
    creatorId,
    extraAccess,
    secrecyLevel,
    tags,
    title,
    troop,
    type,
  })
  return answer(context, caseJson(record), 201)
}

function listCases({ store }: Service, context: Context, caller: Person): Response {
  const errors: FieldError[] = []
  const aboutPersonId = queryField(context, "about_person_id", errors, toInteger)
  const troop = queryField(context, "troop", errors, toText)
  const type = queryField(context, "type", errors, toText)
  const tag = queryField(context, "tag", errors, toText)
  const notOlderThan = queryField(context, "not_older_than", errors, toDatetime)
  const isClosedIncluded = queryField(context, "include_closed", errors, isTrue) ?? false
  if (errors.length > 0) {
    return invalid(context, errors)
  }
  storable(aboutPersonId, troop, type, tag)
  // The filters only narrow the list. Which of its cases the caller reaches is decided after, by
  // the same rule as for a single case.
  const listed = store.cases.filter(
    (record) =>
      (aboutPersonId === undefined || record.aboutPersonId === aboutPersonId) &&
      (troop === undefined || record.troop === troop) &&
      (type === undefined || record.type === type) &&
      (notOlderThan === undefined || record.createdAt * 1000 >= notOlderThan) &&
      (isClosedIncluded || !record.closed) &&
      (tag === undefined || record.tags.includes(tag)),
  )
  return answer(
    context,
    listed
      .toSorted(newestFirst)
      .filter((record) => canReach(caller, record))
      .map((record) => caseJson(record)),
  )
}

function setClosed(
  service: Service,
  context: Context,
  caller: Person,
  isClosing: boolean,
): Response {
  const solved = solveCase(service, context, caller, isClosing)
  if (solved instanceof Response) {
    return solved
  }
  const { errors, record } = solved
  routeCaseId(context, errors)
  if (record === undefined) {
    return invalid(context, errors)
  }
  if (!isClosing && !record.closed) {
    return detail(context, "Case is not closed", 409)
  }
  const closer = isClosing ? caller.userId() : undefined
  storable(closer)
  record.closed = isClosing
  record.closedAt = isClosing ? service.now() : undefined
  record.closedById = closer
  return answer(context, caseJson(record))
}

const optionalSecrecy: Validator<bigint | undefined> = (input, loc, errors) =>
  input === undefined ? undefined : secrecy(input, loc, errors)

function createNote(service: Service, context: Context, caller: Person, body: PyValue): Response {
  const solved = solveCase(service, context, caller, true)
  if (solved instanceof Response) {
    return solved
  }
  const { errors, record } = solved
  routeCaseId(context, errors)
  const fields = modelOf(body, errors)
  const sent = fields && bodyField(fields, "secrecy_level", errors, optionalSecrecy, false)
  const title = (fields && bodyField(fields, "title", errors, toText, true)) ?? ""
  const note = (fields && bodyField(fields, "note", errors, toText, true)) ?? ""
  const tags = (fields && bodyField(fields, "tags", errors, texts, false)) ?? []
  if (record === undefined || errors.length > 0) {
    return invalid(context, errors)
  }
  const secrecyLevel = sent === undefined ? record.secrecyLevel : Number(sent)
  if (secrecyLevel < record.secrecyLevel) {
    const text = "Note secrecy level must be equal or higher than the case's secrecy level"
    return detail(context, text, 422)
  }
  // Level 4 keeps grantees out, so one of them must not slip notes past the others.
  if (secrecyLevel === 4 && !isRoleHolder(caller, record)) {
    return onlyRoleHolders(context)
  }
  const creatorId = caller.userId()
  storable(creatorId, title, note, tags)
  const written = { createdAt: service.now(), creatorId, note, secrecyLevel, tags, title }
  return answer(context, noteJson(service.store.addNote(record, written)), 201)
}

function listNotes(service: Service, context: Context, caller: Person): Response {
  const solved = solveCase(service, context, caller, false)
  if (solved instanceof Response) {
    return solved
  }
  const { errors, record } = solved
  routeCaseId(context, errors)
  if (record === undefined) {
    return invalid(context, errors)
  }
  const notes = service.store.notes.filter((note) => note.caseId === record.id)
  // The service logs every read under the reader's number once it has the notes. The log is not
  // kept here, but the number is still asked for.
  caller.userId()
  return answer(
    context,
    notes
      .toSorted(newestFirst)
      .filter((note) => canReadNote(caller, record, note))
      .map((note) => noteJson(note)),
  )
}

function listAccess(service: Service, context: Context, caller: Person): Response {
  const solved = solveCase(service, context, caller, false)
  if (solved instanceof Response) {
    return solved
  }
  if (solved.record === undefined) {
    return invalid(context, solved.errors)
  }
  return answer(context, membersWithAccess(service.participantsList, solved.record))
}

// What a PUT changes, once its case is solved and its one body field is valid.
type Change<T> = (record: CaseRecord, value: T) => Response

// A PUT on an open case whose body is a model of one field, and the route's own case id beside
// it. Past validation only a nullable field is undefined, and there undefined is its null.
function changeCase<T>(
  service: Service,
  context: Context,
  caller: Person,
  body: PyValue,
  field: readonly [name: string, validate: Validator<T>, change: Change<T>],
): Response {
  const [name, validate, change] = field
  const solved = solveCase(service, context, caller, true)
  if (solved instanceof Response) {
    return solved
  }
  const { errors, record } = solved
  routeCaseId(context, errors)
  const fields = modelOf(body, errors)
  const value = fields && bodyField(fields, name, errors, validate, true)
  if (record === undefined || errors.length > 0) {
    return invalid(context, errors)
  }
  return change(record, value as T)
}

function changeAssignee(
  service: Service,
  context: Context,
  caller: Person,
  body: PyValue,
): Response {
  return changeCase(service, context, caller, body, [
    "assigned_to_id",
    toNullableInteger,
    (record, assignee) => {
      // Checked only here, so an assignee who later loses access stays assigned until someone
      // reassigns the case.
      const members = membersWithAccess(service.participantsList, record)
      if (assignee !== undefined && !members.includes(assignee)) {
        return detail(context, `Member ${String(assignee)} has no access to this case`, 422)
      }
      record.assignedToId = assignee
      return answer(context, caseJson(record))
    },
  ])
}

function changeExtraAccess(
  service: Service,
  context: Context,
  caller: Person,
  body: PyValue,
): Response {
  return changeCase(service, context, caller, body, [
    "extra_access",
    integers,
    (record, extraAccess) => {
      // A grantee must not pass access on.
      if (!isRoleHolder(caller, record)) {
        return onlyRoleHolders(context)
      }
      const refused = refuseExtraAccess(context, record.secrecyLevel, extraAccess)
      if (refused !== undefined) {
        return refused
      }
      storable(extraAccess)
      record.extraAccess = extraAccess
      return answer(context, caseJson(record))
    },
  ])
}

function changeTags(service: Service, context: Context, caller: Person, body: PyValue): Response {
  return changeCase(service, context, caller, body, [
    "tags",
    texts,
    (record, tags) => {
      storable(tags)
      record.tags = tags
      return answer(context, caseJson(record))
    },
  ])
}

function changeTitle(service: Service, context: Context, caller: Person, body: PyValue): Response {
  return changeCase(service, context, caller, body, [
    "title",
    toNonEmptyText,
    (record, title) => {
      storable(title)
      record.title = title
      return answer(context, caseJson(record))
    },
  ])
}

function changeNoteTags(
  service: Service,
  context: Context,
  caller: Person,
  body: PyValue,
): Response {
  const solved = solveCase(service, context, caller, true)
  if (solved instanceof Response) {
    return solved
  }
  const { errors, record } = solved
  routeCaseId(context, errors)
  const noteId = pathInteger(context, "noteId", "note_id", errors)
  const fields = modelOf(body, errors)
  const tags = fields && bodyField(fields, "tags", errors, texts, true)
  if (record === undefined || tags === undefined || errors.length > 0) {
    return invalid(context, errors)
  }
  storable(noteId)
  const note = service.store.findNote(BigInt(record.id), noteId)
  if (note === undefined || !canReadNote(caller, record, note)) {
    return detail(context, "Note not found", 404)
  }
  storable(tags)
  note.tags = tags
  return answer(context, noteJson(note))
}

function listTags({ store }: Service, context: Context, caller: Person): Response {
  const reached = new Map(
    store.cases.filter((record) => canReach(caller, record)).map((record) => [record.id, record]),
  )
  const tags = new Set(reached.values().flatMap((record) => record.tags))
  for (const note of store.notes) {
    const record = reached.get(note.caseId)
    if (record !== undefined && canReadNote(caller, record, note)) {
      for (const tag of note.tags) {
        tags.add(tag)
      }
    }
  }
  // Python's `sorted()` orders text by code point, which is the byte order of its UTF-8.
  return answer(
    context,
    [...tags].toSorted((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right))),
  )
}

type Method = "DELETE" | "GET" | "PATCH" | "POST" | "PUT"

// Every path the service declares, with its methods in declaration order. Starlette answers any
// other method with 405, allowing the first route that matched the path.
const declared: readonly (readonly [string, readonly Method[]])[] = [
  ["/cases", ["POST", "GET"]],
  ["/cases/:caseId/close", ["POST"]],
  ["/cases/:caseId/reopen", ["POST"]],
  ["/cases/:caseId/notes", ["POST", "GET"]],
  ["/cases/:caseId/access", ["GET"]],
  ["/cases/:caseId/extra_access", ["PUT"]],
  ["/cases/:caseId/assignee", ["PUT"]],
  ["/cases/:caseId/title", ["PUT"]],
  ["/cases/:caseId/tags", ["PUT"]],
  ["/cases/:caseId/notes/:noteId/tags", ["PUT"]],
  ["/cases/tags", ["GET"]],
  ["/cases/types", ["GET"]],
]
const methods: readonly Method[] = ["DELETE", "GET", "PATCH", "POST", "PUT"]

function isDeclared(path: string): boolean {
  const segments = path.split("/")
  return declared.some(([pattern]) => {
    const expected = pattern.split("/")
    return (
      expected.length === segments.length &&
      expected.every((part, index) => {
        const segment = segments.at(index) ?? ""
        return part.startsWith(":") ? segment !== "" : part === segment
      })
    )
  })
}

// Starlette's answer to a path that matches a route only without its trailing slashes: a
// redirect to that path. The service runs at the root of its origin behind an ingress that strips
// its prefix, so the address it builds drops the prefix – on dev as here.
function withoutTrailingSlash(context: Context): Response {
  const url = new URL(context.req.url)
  let path = url.pathname.slice(url.pathname.indexOf("/cases"))
  while (path.endsWith("/")) {
    path = path.slice(0, -1)
  }
  if (!url.pathname.endsWith("/") || !isDeclared(path)) {
    return notFound(context)
  }
  return context.redirect(`http://${url.host}${path}${url.search}`, 307)
}

/**
 * Builds `/cases` and everything beneath it over a store of its own, seeded with a case of each
 * type, so every app starts from the same cases and a test's writes stay in its app.
 * @param dependencies The auth service's key, the clock that dates what is written, and the list
 * of participants, which says who is in a troop and who could be given a case.
 * @returns The routes, ready to be mounted at the project API's root.
 */
export function caseRoutes(dependencies: ProjectDependencies): Hono {
  const service: Service = {
    now: dependencies.now,
    participantsList: dependencies.participantsList,
    store: seededStore(),
  }
  const route = (hasBody: boolean, handle: Handler): Route => guarded(dependencies, hasBody, handle)
  const change = (changing: typeof changeTags): Route =>
    route(true, (context, caller, body) => changing(service, context, caller, body))

  const router = new Hono()
  router.post(
    "/cases",
    route(true, (context, caller, body) => createCase(service, context, caller, body)),
  )
  router.get(
    "/cases",
    route(false, (context, caller) => listCases(service, context, caller)),
  )
  router.post(
    "/cases/:caseId/close",
    route(false, (context, caller) => setClosed(service, context, caller, true)),
  )
  router.post(
    "/cases/:caseId/reopen",
    route(false, (context, caller) => setClosed(service, context, caller, false)),
  )
  router.post(
    "/cases/:caseId/notes",
    route(true, (context, caller, body) => createNote(service, context, caller, body)),
  )
  router.get(
    "/cases/:caseId/notes",
    route(false, (context, caller) => listNotes(service, context, caller)),
  )
  router.get(
    "/cases/:caseId/access",
    route(false, (context, caller) => listAccess(service, context, caller)),
  )
  router.put("/cases/:caseId/extra_access", change(changeExtraAccess))
  router.put("/cases/:caseId/assignee", change(changeAssignee))
  router.put("/cases/:caseId/title", change(changeTitle))
  router.put("/cases/:caseId/tags", change(changeTags))
  router.put("/cases/:caseId/notes/:noteId/tags", change(changeNoteTags))
  router.get(
    "/cases/tags",
    route(false, (context, caller) => listTags(service, context, caller)),
  )
  router.get(
    "/cases/types",
    route(false, (context, caller) => answer(context, typesFor(caller))),
  )
  for (const [path, allowed] of declared) {
    const refused = methods.filter((method) => !allowed.includes(method))
    router.on(refused, path, (context) => {
      context.header("Allow", allowed.at(0))
      return context.json({ detail: "Method Not Allowed" }, 405)
    })
  }
  router.all("/cases/*", (context) => withoutTrailingSlash(context))
  return router
}
