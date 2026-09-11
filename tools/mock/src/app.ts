import { Hono } from "hono"

import { forms, participants, readCmtRoles } from "../seed/participants/index.ts"
import { RoleCache } from "./auth/roles.ts"
import { authHealth, authRoutes } from "./auth/routes.ts"
import { controlRoutes } from "./control/routes.ts"
import { noCache, notFound } from "./fastapi.ts"
import { generateSigningKey, type SigningKey } from "./keys.ts"
import { decodeRegister } from "./project/register.ts"
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
 * Builds the mock: wsj27-auth-api under `/api/auth` and wsj27-project-api under `/api/project`,
 * both answering as the real services answer, with the ScoutID stand-in under
 * `/__mock__/scoutid` and the control surface under `/__mock__`. The two service prefixes are the
 * ones the deployed ingress serves, so an address that works here works against dev unchanged.
 * Importing this module starts no server; `main.ts` does that.
 * @param options The key and the clock, when a test supplies its own.
 * @returns The routes, ready to be served or to answer a request in a test.
 */
export function createApp(options: MockOptions = {}): Hono {
  const now = options.now ?? Date.now
  const key = options.key ?? generateSigningKey()
  const register = decodeRegister(participants, forms, loadCmtRoles(readCmtRoles()))
  const roles = new RoleCache(roleMapOf(register), now())
  const scoutId = new ScoutId(now)

  const app = new Hono()
  app.use("/api/*", noCache)
  // Each service answers its root with or without the slash: the ingress strips the prefix, and
  // both spellings arrive as the service's own `/`.
  app.get("/api/auth/", (context) => authHealth(context, roles))
  app.get("/api/project/", (context) => projectHealth(context))
  app.route("/api/auth", authRoutes({ key, now, roles, scoutId }))
  app.route("/api/project", projectRoutes({ key, now, register }))
  app.route("/__mock__/scoutid", scoutIdRoutes(scoutId))
  app.route("/__mock__", controlRoutes(scoutId, roles))
  app.notFound((context) => notFound(context))
  return app
}
