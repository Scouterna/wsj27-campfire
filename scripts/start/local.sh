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
#
# `--lan` serves a phone on the same network instead: the mock answers sign-in on this
# machine's network address rather than localhost, and the Apple shell's Local scheme
# loads from that address for as long as the stack runs.
set -eu

lan=""
while [ $# -gt 0 ]; do
  case "$1" in
    --lan)
      lan=1
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Expected nothing, or --lan to serve a phone on this machine's network address." >&2
      exit 1
      ;;
  esac
  shift
done

# shellcheck source=scripts/start/helpers.sh
. "$(dirname "$0")/helpers.sh"
cd "$repository"

if ! command -v caddy >/dev/null 2>&1; then
  echo "caddy is not installed – brew install caddy" >&2
  exit 1
fi

# The origin a browser reaches the stack at. The mock signs in only there, because the
# auth service sends the flow back only to its own public address.
origin="http://localhost:8000"

# A run that was killed outright leaves its file behind, which would point the Apple
# shell at an address nothing serves.
lan_config="$repository/apps/apple/config/Lan.xcconfig"
rm -f "$lan_config"

if [ -n "$lan" ]; then
  # Read now rather than written down, because DHCP moves it.
  address=$(ipconfig getifaddr en0 2>/dev/null || true)
  [ -n "$address" ] || die "No address on en0 – join a network, or start without --lan."
  origin="http://$address:8000"
fi

free_port caddy 8000
free_port mock 8003
free_port web 3000

arm_trap

if [ -n "$lan" ]; then
  # `//` starts a comment in an xcconfig, so the URL's is written `/$()/`.
  printf '// Written by `pnpm start:local --lan`, and removed when it stops.\nCAMPFIRE_WEB_ORIGIN = http:/$()/%s:8000\n' \
    "$address" >"$lan_config"
  remove_on_exit "$lan_config"
fi

start_process caddy caddy run --config config/environments/local/Caddyfile --adapter caddyfile
start_process mock env CAMPFIRE_MOCK_ORIGIN="$origin" pnpm --filter @scouterna/wsj27-campfire-mock start
start_process web pnpm --filter @scouterna/wsj27-campfire-web start

wait_for caddy http://localhost:8000/ 15
wait_for mock http://localhost:8003/__mock__/state 30
wait_for web http://localhost:3000/ 60

# Checked again through Caddy, because those are the addresses the browser and the
# shells use.
wait_for_ok "the mock through Caddy" http://localhost:8000/__mock__/state 10
wait_for_ok "the web through Caddy" http://localhost:8000/ 10

echo
echo "Campfire local: $origin"
if [ -n "$lan" ]; then
  echo "  The Apple shell's Local scheme loads from here – run it on the phone from Xcode."
fi
echo "  caddy  8000   mock  8003   web  3000"
echo "Ctrl+C stops all three."
echo

supervise
