#!/bin/sh
# Build the shell in the Local configuration (Debug), install it on a simulator, and
# launch it against whatever is running on http://localhost:8000 – `pnpm start:local`,
# `start:dev`, or `start:prod`.
#
# The shell always points at this machine, so the environment is a property of the
# stack rather than of the build: the Local configuration is what start uses, and Dev
# and Prod exist for `pnpm build:apple:dev` and `:prod`.
#
# The simulator is resolved rather than named – see simulator.sh – so this works on a
# machine with a different set of runtimes installed.

set -eu

here=$(cd "$(dirname "$0")" && pwd)
cd "$here/../../apps/apple"

environment=Local
# The stack has to be up – a shell that opens on a blank webview says nothing about
# which side is missing.
if ! curl -s -o /dev/null --max-time 2 http://localhost:8000/; then
  echo "Nothing answers on http://localhost:8000 – start a stack first:" >&2
  echo "  pnpm start:local   the mock backend" >&2
  echo "  pnpm start:dev     the real backend" >&2
  echo "  pnpm start:prod    the built image" >&2
  exit 1
fi

device=$(sh "$here/simulator.sh")

echo "Simulator: $device"

# Already booted is not a failure, it is the common case.
xcrun simctl boot "$device" 2>/dev/null || true
open -a Simulator

sh "$here/build.sh" local

# Asked of the build rather than constructed or read out of an xcconfig. The products
# directory is named after the configuration – ".build/Build/Products/Local
# (Debug)-iphonesimulator", spaces and parentheses included – and the bundle
# identifier and product name are whatever the xcconfig chain resolved them to, so
# reading the settings the build itself used is the one answer that cannot drift.
settings=$(
  xcodebuild \
    -project Campfire.xcodeproj \
    -scheme "Campfire $environment" \
    -configuration "$environment (Debug)" \
    -destination 'generic/platform=iOS Simulator' \
    -derivedDataPath .build \
    -showBuildSettings 2>/dev/null
)
setting() { printf '%s\n' "$settings" | sed -n "s/^ *$1 = //p" | head -1; }

products=$(setting BUILT_PRODUCTS_DIR)
product=$(setting FULL_PRODUCT_NAME)
bundle=$(setting PRODUCT_BUNDLE_IDENTIFIER)

xcrun simctl install "$device" "$products/$product"
xcrun simctl launch "$device" "$bundle"
