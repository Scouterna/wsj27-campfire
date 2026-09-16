import { createHash } from "node:crypto"

import type { Context } from "hono"

import { pythonJson } from "../json.ts"
import { hasAnyRole, type AuthUser } from "./authentication.ts"
import type { ParticipantsList } from "./participants-list.ts"

// The callers allowed the whole map, matched by prefix: the auth service's bulk reader, other
// mirrors' reader, and every roll within the Admin function.
const roleMapRoles = ["wsj27:bulkread", "wsj27:cmt:admin", "wsj27:rolereader"]

/**
 * Every participant's roles keyed by member number, leaving out anyone who holds none – the
 * map the role endpoint serves and the auth service caches.
 * @param participantsList The decoded list of participants.
 * @returns The roles per member number.
 */
export function roleMapOf(
  participantsList: ParticipantsList,
): ReadonlyMap<string, readonly string[]> {
  return new Map(
    participantsList
      .values()
      .filter((record) => record.roles.length > 0)
      .map((record) => [String(record.member_no), record.roles]),
  )
}

/**
 * `GET /participants/roles` – the map, to a caller allowed it, with an ETag over the exact body
 * so an unchanged map is a 304. Anyone else gets a 404 rather than a 403, and learns nothing.
 * @param context The request.
 * @param user The verified caller.
 * @param participantsList The decoded list of participants.
 * @returns The map, the 304, or the 404.
 */
export function roleMap(
  context: Context,
  user: AuthUser,
  participantsList: ParticipantsList,
): Response {
  if (!hasAnyRole(user.roles, roleMapRoles)) {
    return context.json({ detail: "Not Found" }, 404)
  }
  const body = pythonJson({ participants: Object.fromEntries(roleMapOf(participantsList)) })
  const etag = `"${createHash("sha256").update(body).digest("hex").slice(0, 32)}"`
  const sent = context.req.header("If-None-Match") ?? ""
  const tags = sent.split(",").map((tag) => tag.trim().replace(/^W\//u, ""))
  if (sent !== "" && tags.includes(etag)) {
    // eslint-disable-next-line unicorn/no-null -- a 304 carries no body
    return context.body(null, 304, { ETag: etag })
  }
  return context.body(body, 200, { "Content-Type": "application/json", ETag: etag })
}
