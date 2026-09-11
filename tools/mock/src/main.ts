import { serve } from "@hono/node-server"

import { createApp } from "./app.ts"

/**
 * Where the mock listens. The local Caddy proxies `/api/auth/*`, `/api/project/*`, and
 * `/__mock__/*` here from the one origin everything shares, `http://localhost:8000` –
 * nothing talks to this port directly except Caddy.
 */
const port = 8003

serve({ fetch: createApp().fetch, port }, (info) => {
  process.stdout.write(`Mock back-end listening on http://localhost:${String(info.port)}\n`)
})
