#!/bin/sh
# The local environment, in one command: Caddy as the front door on 8000, the mock
# back-end on 8003, and the Vite dev server on 3000. Browse http://localhost:8000, where
# sign-in is the persona picker – no password, and no network beyond this machine.
#
# Whatever already holds one of the ports – an earlier run, a server a closed terminal
# left behind, the dev or prod environment's containers – is stopped first and named.
# Each server is reported only once it answers, and the whole stack is checked through
# the front door before the prompt says it is up. Ctrl+C stops everything, and so does
# any one server dying.
set -eu

# shellcheck source=scripts/start/helpers.sh
. "$(dirname "$0")/helpers.sh"
cd "$repository"

if ! command -v caddy >/dev/null 2>&1; then
  echo "caddy is not installed – brew install caddy" >&2
  exit 1
fi

free_port caddy 8000
free_port mock 8003
free_port web 3000

arm_trap

start_process caddy caddy run --config config/environments/local/Caddyfile --adapter caddyfile
start_process mock pnpm --filter @scouterna/wsj27-campfire-mock start
start_process web pnpm --filter @scouterna/wsj27-campfire-web start

wait_for caddy http://localhost:8000/ 15
wait_for mock http://localhost:8003/__mock__/state 30
wait_for web http://localhost:3000/ 60

# Checked again through Caddy, because those are the addresses the browser and the
# shells use.
wait_for_ok "the mock through Caddy" http://localhost:8000/__mock__/state 10
wait_for_ok "the web through Caddy" http://localhost:8000/ 10

echo
echo "Campfire local: http://localhost:8000"
echo "  caddy  8000   mock  8003   web  3000"
echo "Ctrl+C stops all three."
echo

supervise
