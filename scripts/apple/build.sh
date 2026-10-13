#!/bin/sh
# Build the shell in one environment (Debug), for the iOS Simulator – or for a device,
# when CAMPFIRE_DEVICE is set.
#
# Usage:
#   build.sh [local|dev|prod]
#
# The environment defaults to local. A script rather than a line in package.json
# because xcodebuild needs the project directory as its working directory, and because
# the invocation is too long to read on one line.

set -eu

here=$(cd "$(dirname "$0")" && pwd)
cd "$here/../../apps/apple"

environment=$(sh "$here/environment.sh" "${1:-local}")

# The Local origin is localhost, which a real phone cannot reach. CAMPFIRE_DEVICE=1
# builds for a phone instead, with this machine's LAN address as the origin – read now
# rather than committed, because DHCP moves it. Sign-in completes only against a stack
# started with `pnpm start:local --lan`, whose mock answers on the same address.
destination='generic/platform=iOS Simulator'
origin=""
if [ "$environment" = "Local" ] && [ -n "${CAMPFIRE_DEVICE:-}" ]; then
  address=$(ipconfig getifaddr en0 2>/dev/null || true)
  if [ -n "$address" ]; then
    # Port 8000, because it is the one origin every environment serves and Caddy answers
    # there on every interface, while the bare Vite server carries none of the back-end
    # paths.
    destination='generic/platform=iOS'
    origin="CAMPFIRE_WEB_ORIGIN=http://${address}:8000"
    echo "Web origin: http://${address}:8000 – sign in against \`pnpm start:local --lan\`."
  else
    echo "Web origin: the xcconfig's localhost – no address on en0." >&2
  fi
fi

# Word splitting is what carries the optional override here, so globbing is off for the
# run rather than the expansion being quoted.
set -f
# shellcheck disable=SC2086
exec xcodebuild build \
  -project Campfire.xcodeproj \
  -scheme "Campfire $environment" \
  -configuration "$environment (Debug)" \
  -destination "$destination" \
  -derivedDataPath .build \
  -skipMacroValidation \
  -skipPackagePluginValidation \
  ${origin}
