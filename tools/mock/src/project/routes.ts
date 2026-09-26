import { Hono, type Context } from "hono"

import { refuseOtherMethods } from "../fastapi.ts"
import { requireAuthUser } from "./authentication.ts"
import { participantRoutes, type ProjectDependencies } from "./participants.ts"

/**
 * `GET /` – the service's health check, which takes no authentication.
 * @param context The request.
 * @returns The health check.
 */
export function projectHealth(context: Context): Response {
  return context.json({ status: "ok", service: "wsj27-project-api" })
}

/**
 * Builds `/api/project`: wsj27-project-api as the dev environment runs it – its health check, the
 * participant routes, and the Scoutnet refresh. The cases service is absent, as it is wherever
 * wsj27-project-api runs without a database.
 * @param dependencies The auth service's key, the clock, and the list of participants.
 * @returns The routes, ready to be mounted at `/api/project`.
 */
export function projectRoutes(dependencies: ProjectDependencies): Hono {
  const router = new Hono()
  router.get("/", (context) => projectHealth(context))
  router.route("/participants", participantRoutes(dependencies))
  // Any signed-in caller may ask the service to fetch Scoutnet again. The seeded list of
  // participants is already everything there is, so the refetch does nothing but answer as the
  // service does.
  router.get("/scoutnet/refresh", (context) => {
    const user = requireAuthUser(context, dependencies.key, dependencies.now())
    // eslint-disable-next-line unicorn/no-null -- the route returns None, which FastAPI sends as null
    return user instanceof Response ? user : context.json(null)
  })
  refuseOtherMethods(router, "/", "GET")
  refuseOtherMethods(router, "/scoutnet/refresh", "GET")
  return router
}
