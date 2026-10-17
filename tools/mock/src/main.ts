import { serve } from "@hono/node-server"

import { createApp } from "./app.ts"

/**
 * Where the mock listens. The local Caddy proxies the mock's paths here from the one origin
 * everything shares, and nothing else talks to this port.
 */
const port = 8003

// The journey spike reads Airtable with the local environment's token, kept in the ignored
// env file rather than the tree. Without the file the mock runs as before, and the journey
// routes answer 500.
try {
  // eslint-disable-next-line n/no-unsupported-features/node-builtins -- .tool-versions pins a Node that has it
  process.loadEnvFile(new URL("../../../config/environments/local/.env", import.meta.url))
} catch {
  process.stderr.write("No config/environments/local/.env – the journey spike has no Airtable\n")
}

serve({ fetch: createApp().fetch, port }, (info) => {
  process.stdout.write(`Mock back-end listening on http://localhost:${String(info.port)}\n`)
})
