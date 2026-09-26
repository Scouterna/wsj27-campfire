#!/bin/sh
# The prod environment – the containers `pnpm start:dev` brings up, with the built
# image serving the web instead of Vite.
set -eu

exec sh "$(dirname "$0")/dev.sh" prod "$@"
