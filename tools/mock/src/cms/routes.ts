import { readFileSync } from "node:fs"

import { Hono } from "hono"

import handbook from "../../seed/handbook.json" with { type: "json" }

/**
 * The CMS's uploaded files the seed names, by file name, read once at start.
 */
const media: ReadonlyMap<string, { readonly body: Uint8Array; readonly type: string }> = new Map([
  [
    "image4-756x373.webp",
    {
      body: readFileSync(new URL("../../static/cms/image4-756x373.webp", import.meta.url)),
      type: "image/webp",
    },
  ],
])

/**
 * The moment the seed's pages were saved as of. Their change notes are written days
 * before it – one for each stretch a change fades through, from today to past news – and
 * answered as that many days before now, so the handbook always has news of every age,
 * whatever day it is read.
 */
const seededAt = Date.parse("2026-09-25T12:00:00.000Z")

const dayMs = 24 * 60 * 60 * 1000

/**
 * The seeded handbook as the CMS would answer it now: every page's change note and last
 * save moved forward by the whole days since the seed's moment, so two reads the same
 * day answer the same moments.
 * @param now The clock's moment, in milliseconds.
 * @returns The listing.
 */
function handbookAt(now: number): typeof handbook {
  const shift = Math.floor((now - seededAt) / dayMs) * dayMs
  const moved = (at: string): string => new Date(Date.parse(at) + shift).toISOString()
  return {
    ...handbook,
    docs: handbook.docs.map((page) => ({
      ...page,
      changeNoteAt: moved(page.changeNoteAt),
      updatedAt: moved(page.updatedAt),
    })),
  }
}

/**
 * Builds `/services/cms`: the two reads Campfire makes of the CMS. The page listing with
 * its chapters populated answers with the seeded handbook, dated from now, and the CMS
 * publishes it openly, so it takes no session. Its query – depth, limit, and sort – is
 * not read, because the seed is always the whole handbook in one page, and the reader
 * orders the pages itself. An uploaded file answers by its name, as openly, and a name
 * the seed does not carry is not found.
 * @param now The clock, in milliseconds.
 * @returns The routes, ready to be mounted at `/services/cms`.
 */
export function cmsRoutes(now: () => number): Hono {
  const router = new Hono()
  router.get("/api/info-page", (context) => context.json(handbookAt(now())))
  router.get("/api/media/file/:name", (context) => {
    const file = media.get(context.req.param("name"))
    if (file === undefined) {
      return context.json({ errors: [{ message: "Not Found" }] }, 404)
    }
    return context.body(new Uint8Array(file.body), 200, { "Content-Type": file.type })
  })
  return router
}
