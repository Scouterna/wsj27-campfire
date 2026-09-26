#!/bin/sh
# One dev server, started the way the local environment starts its own: the port is
# freed first and the previous holder named, the server is reported only once it answers
# on its port, and Ctrl+C stops it – the node behind pnpm included, which a plain Ctrl+C
# on some wrappers does not reach. A second start of the same server therefore replaces
# the first rather than failing on a busy port.
#
#   sh scripts/start/server.sh <name> <port> <command...>
set -eu

# shellcheck source=scripts/start/helpers.sh
. "$(dirname "$0")/helpers.sh"
cd "$repository"

[ $# -ge 3 ] || die "Usage: server.sh <name> <port> <command...>"

name=$1
port=$2
shift 2

free_port "$name" "$port"

arm_trap

start_process "$name" "$@"
wait_for "$name" "http://localhost:$port/" 90

echo
echo "$name: http://localhost:$port"
echo "Ctrl+C stops it."
echo

supervise
