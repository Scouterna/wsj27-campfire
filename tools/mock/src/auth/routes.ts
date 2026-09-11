import { readFileSync } from "node:fs"

import { Hono, type Context } from "hono"

import { refuseOtherMethods } from "../fastapi.ts"
import { completeLogin, login, logout, refresh, user } from "./browser.ts"
import { certs, discoveryDocument, token } from "./machine.ts"
import type { RoleCache } from "./roles.ts"
import type { AuthDependencies } from "./session.ts"

/**
 * `GET /` – the service's health check, which takes no authentication and reports the role
 * cache beside the service's name.
 * @param context The request.
 * @param roles The role cache whose state is reported.
 * @returns The health check.
 */
export function authHealth(context: Context, roles: RoleCache): Response {
  return context.json({ status: "ok", service: "wsj27-auth-api", roles: roles.status() })
}

/**
 * Builds `/api/auth`: every route wsj27-auth-api serves, answering as it answers. The one thing
 * that is not the service's is the identity provider behind it – the ScoutID stand-in under
 * `/__mock__/scoutid`.
 * @param dependencies The key, the clock, the role map, and ScoutID.
 * @returns The routes, ready to be mounted at `/api/auth`.
 */
export function authRoutes(dependencies: AuthDependencies): Hono {
  // The service's own script, copied in verbatim, so the keep-alive loop an app runs locally is
  // the one it runs against dev.
  const refreshScript = readFileSync(new URL("../../static/refresh.js", import.meta.url), "utf8")
  const router = new Hono()

  router.get("/", (context) => authHealth(context, dependencies.roles))
  router.get("/login", (context) => login(context))
  router.get("/callback", (context) => completeLogin(context, dependencies))
  router.get("/refresh", (context) => refresh(context, dependencies))
  router.get("/user", (context) => user(context, dependencies))
  router.get("/logout", (context) => logout(context, dependencies))
  router.post("/token", (context) => token(context))
  router.get("/certs", (context) => certs(context, dependencies.key))
  router.get("/.well-known/openid-configuration", (context) => discoveryDocument(context))
  router.get("/static/refresh.js", (context) =>
    context.body(refreshScript, 200, { "Content-Type": "application/javascript" }),
  )

  for (const path of [
    "/",
    "/login",
    "/callback",
    "/refresh",
    "/user",
    "/logout",
    "/certs",
    "/.well-known/openid-configuration",
    "/static/refresh.js",
  ]) {
    refuseOtherMethods(router, path, "GET")
  }
  refuseOtherMethods(router, "/token", "POST")

  return router
}
