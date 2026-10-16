import { Hono } from "hono"

import handbook from "../../seed/handbook.json" with { type: "json" }

/**
 * Builds `/services/cms`: the one read Campfire makes of the CMS, the page listing with
 * its chapters populated, answered with the seeded handbook. The CMS publishes the
 * handbook openly, so the listing takes no session. Its query – depth, limit, and sort –
 * is not read, because the seed is always the whole handbook in one page, and the reader
 * orders the pages itself.
 * @returns The routes, ready to be mounted at `/services/cms`.
 */
export function cmsRoutes(): Hono {
  const router = new Hono()
  router.get("/api/info-page", (context) => context.json(handbook))
  return router
}
