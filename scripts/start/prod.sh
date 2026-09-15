#!/bin/sh
# The prod environment: the same containers `pnpm start:dev` brings up, with the built
# image serving the web instead of Vite. See scripts/start/dev.sh, which does the work.
set -eu

exec sh "$(dirname "$0")/dev.sh" prod "$@"
