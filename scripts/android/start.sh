#!/bin/sh
# Build the Android shell in the Local flavor (Debug), install it on an emulator, and
# launch it against whatever is running on http://localhost:8000 – `pnpm start:local`,
# `start:dev`, or `start:prod`.
#
# The shell always points at this machine, so the environment is a property of the
# stack rather than of the build: the Local flavor is what start uses, and the dev and
# prod flavors exist for `pnpm build:android:dev` and `:prod`.

set -eu

here=$(cd "$(dirname "$0")" && pwd)
cd "$here/../../apps/android"

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

# One device, addressed by serial from here on – see emulator.sh for why.
serial=$(sh "$here/emulator.sh")

# The Local flavor's origin is localhost, because sign-in cookies only work on the one
# host name ScoutID sends the flow back to – and localhost inside an emulator is the
# emulator. So bridge the host port straight into the emulator's localhost with an adb
# reverse tunnel, which the Local flavor's base URLs point at.
adb -s "$serial" reverse tcp:8000 tcp:8000

# The Gradle module's directory is config/app, not src/app – a build file under src/
# lands inside the Kotlin source set that src/ defines. settings.gradle.kts says why.
namespace=$(sed -n 's/^ *namespace = "\(.*\)"/\1/p' config/app/build.gradle.kts)

# ANDROID_SERIAL scopes the Gradle install to the resolved device; without it, the
# install task targets every connected device.
ANDROID_SERIAL="$serial" ./gradlew "install${environment}Debug"
adb -s "$serial" shell am start -n "$namespace/$namespace.MainActivity"
