import { Hono } from "hono"

import { forms, participants, readCmtRoles } from "../seed/participants/index.ts"
import { RoleCache } from "./auth/roles.ts"
import { authHealth, authRoutes } from "./auth/routes.ts"
import { controlRoutes } from "./control/routes.ts"
import { noCache, notFound } from "./fastapi.ts"
import { generateSigningKey, type SigningKey } from "./keys.ts"
import { decodeParticipantsList } from "./project/participants-list.ts"
import { roleMapOf } from "./project/role-map.ts"
import { loadCmtRoles } from "./project/roles.ts"
import { projectHealth, projectRoutes } from "./project/routes.ts"
import { ScoutId } from "./scoutid/provider.ts"
import { scoutIdRoutes } from "./scoutid/routes.ts"

/**
 * What a mock is built with, for a test that needs control over it.
 */
export interface MockOptions {
  /**
   * The signing key. A suite passes one key to every app it builds, because generating one
   * takes a noticeable moment.
   */
  readonly key?: SigningKey
  /**
   * The clock, in milliseconds, so a test can march tokens and sessions past their lifetimes.
   */
  readonly now?: () => number
}

/**
 * Builds the mock – both services answering as the real ones answer, beside the ScoutID stand-in
 * and the control surface. The service prefixes are the ones the deployed ingress serves, so an
 * address that works here works against dev unchanged. Building it starts no server.
 * @param options The key and the clock, when a test supplies its own.
 * @returns The routes, ready to be served or to answer a request in a test.
 */
export function createApp(options: MockOptions = {}): Hono {
  const now = options.now ?? Date.now
  const key = options.key ?? generateSigningKey()
  const participantsList = decodeParticipantsList(participants, forms, loadCmtRoles(readCmtRoles()))
  const roles = new RoleCache(roleMapOf(participantsList), now())
  const scoutId = new ScoutId(now)

  const app = new Hono()
  app.use("/api/*", noCache)
  // Each service answers its root with or without the slash, because the ingress strips the
  // prefix and both spellings arrive as the service's own `/`.
  app.get("/api/auth/", (context) => authHealth(context, roles))
  app.get("/api/project/", (context) => projectHealth(context))
  app.route("/api/auth", authRoutes({ key, now, roles, scoutId }))
  app.route("/api/project", projectRoutes({ key, now, participantsList }))
  app.route("/__mock__/scoutid", scoutIdRoutes(scoutId, roles))
  app.route("/__mock__", controlRoutes(scoutId, roles))
  app.notFound((context) => notFound(context))
  return app
}
