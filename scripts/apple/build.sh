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

# Local.xcconfig holds localhost, which is right for the Simulator and is the one host
# name the sign-in cookies work on. A real phone cannot reach it, so CAMPFIRE_DEVICE=1
# overrides the origin with this machine's LAN address – read now rather than
# committed, because DHCP moves it – and builds for the phone rather than the
# Simulator, since a Simulator build is the one thing that address is no use to. Opt-in
# rather than automatic: on a LAN address the app loads but sign-in cannot complete,
# since ScoutID only sends the flow back to localhost, so the trade is made knowingly.
destination='generic/platform=iOS Simulator'
origin=""
if [ "$environment" = "Local" ] && [ -n "${CAMPFIRE_DEVICE:-}" ]; then
  address=$(ipconfig getifaddr en0 2>/dev/null || true)
  if [ -n "$address" ]; then
    # Port 8000, not 3000: 8000 is the one origin every environment serves, and Caddy
    # answers there on every interface. 3000 is the bare Vite dev server, which carries
    # none of the backend paths.
    destination='generic/platform=iOS'
    origin="CAMPFIRE_WEB_ORIGIN=http://${address}:8000"
    echo "Web origin: http://${address}:8000 – sign-in will not complete on a device."
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
