#!/bin/sh
# Resolve a usable iOS simulator and print its name, so that start.sh and test.sh both
# target the same one and neither names a device that only exists on one machine.
#
# Prefers whatever CAMPFIRE_SIMULATOR names, then an iPhone that is already booted,
# then an iPhone on the newest installed iOS runtime that has one. Exits non-zero when
# no iPhone simulator is available.
#
# Node does the JSON, because `simctl list -j` is the only output of the three that is
# not a formatted table – and Node is already a prerequisite for the workspace, so this
# adds nothing to install.

set -eu

if [ -n "${CAMPFIRE_SIMULATOR:-}" ]; then
  printf '%s' "$CAMPFIRE_SIMULATOR"
  exit 0
fi

# The single quotes are deliberate: what they hold is Node's script, not the shell's to
# expand.
# shellcheck disable=SC2016
device=$(
  xcrun simctl list devices available --json | node -e '
    let raw = ""
    process.stdin.on("data", (chunk) => (raw += chunk)).on("end", () => {
      const byRuntime = JSON.parse(raw).devices

      // Only iPhones on an iOS runtime are candidates at all: a booted Apple Watch or
      // Apple TV is an ordinary thing to have on a machine, and neither name resolves
      // for `platform=iOS Simulator`. Newest runtime first, sorted numerically so
      // iOS-27-0 beats iOS-9-0, which a string sort would not.
      const iPhonesByRuntime = Object.entries(byRuntime)
        .filter(([id]) => id.includes("iOS"))
        .sort(([a], [b]) => {
          const parts = (id) => id.split("iOS-")[1].split("-").map(Number)
          const [aMajor, aMinor = 0] = parts(a)
          const [bMajor, bMinor = 0] = parts(b)
          return bMajor - aMajor || bMinor - aMinor
        })
        .map(([, devices]) => devices.filter((device) => device.name.startsWith("iPhone")))

      // A booted simulator wins: the developer put it there, and booting a second
      // one to run beside it is not what anybody meant.
      for (const devices of iPhonesByRuntime) {
        const booted = devices.find((device) => device.state === "Booted")
        if (booted) {
          process.stdout.write(booted.name)
          return
        }
      }

      // Otherwise the newest runtime that actually holds an iPhone – an older one
      // still counts, rather than giving up because the newest happens to be empty.
      for (const devices of iPhonesByRuntime) {
        if (devices.length > 0) {
          process.stdout.write(devices[0].name)
          return
        }
      }
    })
  '
)

if [ -z "$device" ]; then
  echo "No iOS simulator is available." >&2
  echo "Install one in Xcode (Settings > Components), or set CAMPFIRE_SIMULATOR." >&2
  exit 1
fi

# The name is the script's whole output; everything else above went to stderr.
printf '%s' "$device"
