import { readFileSync } from "node:fs"

import { Hono } from "hono"

import { groups, personas } from "../../seed/personas/index.ts"
import type { RoleCache } from "../auth/roles.ts"
import { cookieHeader, plainText, readCookie } from "../fastapi.ts"
import { pickerPage } from "./picker.ts"
import { scoutIdSessionCookie, sessionMaxLifespanSeconds, type ScoutId } from "./provider.ts"

// The stand-in's cookie stays on its own paths, as Keycloak's stays on the realm's.
const cookiePath = "/__mock__/scoutid/"

/**
 * Builds `/__mock__/scoutid`: the stand-in's authorization endpoint, which shows the persona
 * picker; the picker's own landing; and the end-session endpoint.
 * @param scoutId The stand-in the routes answer for.
 * @param roles The role map the auth service fills a token from, which the picker reads
 * each persona's line from.
 * @returns The routes, ready to be mounted at `/__mock__/scoutid`.
 */
export function scoutIdRoutes(scoutId: ScoutId, roles: RoleCache): Hono {
  // The design system's display face, copied into static/ because the mock depends on
  // nothing in the workspace. Read once when the routes are built, as the refresh
  // script is – importing this module starts nothing and touches no disk.
  const displayFace = new Uint8Array(
    readFileSync(new URL("../../static/bravelyscript.woff2", import.meta.url)),
  )
  const router = new Hono()

  router.get("/auth", (context) => {
    const query = context.req.query()
    const outcome = scoutId.authorize(query, readCookie(context, scoutIdSessionCookie))
    if (outcome.kind === "picker") {
      // The picker reads each persona from the same map the auth service fills their
      // token from, so what a row promises is what the session carries.
      return context.html(pickerPage(groups, query, (memberNo) => roles.rolesFor(memberNo)))
    }
    if (outcome.kind === "refused") {
      return plainText(context, outcome.reason, 400)
    }
    return context.redirect(outcome.location, 302)
  })

  router.get("/bravelyscript.woff2", (context) =>
    context.body(displayFace, 200, { "Content-Type": "font/woff2" }),
  )

  router.get("/choose", (context) => {
    const { email, ...query } = context.req.query()
    const persona = email === undefined ? undefined : personas.get(email)
    if (persona === undefined) {
      return plainText(context, "Unknown persona", 400)
    }
    const outcome = scoutId.signIn(persona, query)
    if (outcome.kind === "refused") {
      return plainText(context, outcome.reason, 400)
    }
    const header = cookieHeader(scoutIdSessionCookie, outcome.sessionId, {
      httpOnly: true,
      maxAge: sessionMaxLifespanSeconds,
      path: cookiePath,
      secure: false,
    })
    context.header("Set-Cookie", header, { append: true })
    return context.redirect(outcome.location, 302)
  })

  router.get("/logout", (context) => {
    const returnTo = context.req.query("post_logout_redirect_uri")
    if (returnTo === undefined || !scoutId.endSession(context.req.query("id_token_hint"))) {
      return plainText(context, "Invalid parameter: id_token_hint", 400)
    }
    const header = cookieHeader(scoutIdSessionCookie, "", {
      httpOnly: true,
      maxAge: 0,
      path: cookiePath,
      secure: false,
    })
    context.header("Set-Cookie", header, { append: true })
    return context.redirect(returnTo, 302)
  })

  return router
}
