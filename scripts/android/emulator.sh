#!/bin/sh
# Resolve a usable Android device, booting an emulator when none is attached, and print
# its serial – so the caller can address exactly this device. With a phone plugged in
# beside an emulator, an unscoped `adb shell` or an unscoped Gradle install goes to both
# or fails, so everything downstream takes the serial this prints.
#
# Prefers a device that is already attached; otherwise starts an AVD – CAMPFIRE_AVD,
# else the first one this machine has – and waits for it to finish booting. Exits
# non-zero when no AVD is installed or the boot does not finish in time.

set -eu

if ! command -v adb >/dev/null 2>&1; then
  echo "adb is not on the PATH." >&2
  echo "Add \$ANDROID_HOME/platform-tools to it." >&2
  exit 1
fi

# `adb devices` prints a header line whatever happens, so read the rest. A device that
# is attached but not yet fully up shows a state other than "device" and is not taken.
serial=$(adb devices | sed '1d' | awk '$2 == "device" { print $1; exit }')

if [ -z "$serial" ]; then
  if ! command -v emulator >/dev/null 2>&1; then
    echo "No device is attached and the emulator is not on the PATH." >&2
    echo "Add \$ANDROID_HOME/emulator to it, or start a device yourself." >&2
    exit 1
  fi

  avd="${CAMPFIRE_AVD:-$(emulator -list-avds | head -1)}"
  if [ -z "$avd" ]; then
    echo "No Android virtual device exists." >&2
    echo "Create one in Android Studio (Device Manager), or set CAMPFIRE_AVD." >&2
    exit 1
  fi

  # Launch on an explicit free even port, so the serial is known up front rather than
  # discovered after the fact – an emulator's serial is "emulator-<port>".
  port=5554
  while adb devices | grep -q "^emulator-$port"; do
    port=$((port + 2))
  done
  serial="emulator-$port"

  echo "Starting emulator: $avd ($serial)" >&2
  emulator -avd "$avd" -port "$port" -no-snapshot-load -no-boot-anim >/dev/null 2>&1 &
fi

# One deadline for the waits below, so an emulator that never comes up fails loudly
# instead of hanging.
deadline=$(($(date +%s) + 300))

# Polled rather than `adb wait-for-device`, which blocks forever, so an emulator that
# dies on launch – a broken AVD, no hardware acceleration, a port already taken – fails
# at the deadline instead of leaving the terminal with nothing at all.
until adb devices | grep -q "^${serial}[[:space:]][[:space:]]*device$"; do
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "$serial never appeared within five minutes." >&2
    exit 1
  fi
  sleep 1
done

# adbd answers long before the package manager is up – so a build that installs
# immediately after it fails with "Can't find service: package". Waiting on the
# property the system sets last is what actually means "ready". getprop errors while
# the device is still registering, so its stderr stays suppressed.
until [ "$(adb -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "$serial did not finish booting within five minutes." >&2
    exit 1
  fi
  sleep 1
done

# The serial is the script's whole output; everything else above went to stderr.
printf '%s' "$serial"
