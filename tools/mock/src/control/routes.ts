import { Hono } from "hono"

import type { RoleCache } from "../auth/roles.ts"
import type { ScoutId } from "../scoutid/provider.ts"

/**
 * Builds the control surface under `/__mock__`, for tests and for putting the stack back to a
 * known state. It reports and resets the ScoutID stand-in's sessions – the only state the mock
 * holds, since the auth service keeps none of its own.
 * @param scoutId The stand-in whose sessions are reported and reset.
 * @param roles The role map, for the roles a signed-in persona's next token carries.
 * @returns The routes, ready to be mounted at `/__mock__`.
 */
export function controlRoutes(scoutId: ScoutId, roles: RoleCache): Hono {
  const router = new Hono()

  router.post("/reset", (context) => {
    scoutId.reset()
    return context.json({ reset: true })
  })

  router.get("/state", (context) =>
    context.json({
      sessions: scoutId.activePersonas().map((persona) => ({
        email: persona.email,
        roles: roles.rolesFor(persona.memberNo),
      })),
    }),
  )

  return router
}
