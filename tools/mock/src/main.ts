import { serve } from "@hono/node-server"

import { createApp } from "./app.ts"

/**
 * Where the mock listens. The local Caddy proxies the mock's paths here from the one origin
 * everything shares, and nothing else talks to this port.
 */
const port = 8003

serve({ fetch: createApp().fetch, port }, (info) => {
  process.stdout.write(`Mock back-end listening on http://localhost:${String(info.port)}\n`)
})
