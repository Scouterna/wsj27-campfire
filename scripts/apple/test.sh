#!/bin/sh
# Runs the test target named as the first argument – CampfireTests for the unit tests,
# CampfireUITests for the walk-through.
#
# xcodebuild builds every test target in the scheme whichever one is selected, so a
# unit-test run also compiles the walk-through, which keeps that suite from rotting
# between the occasions anybody runs it.
#
# Always the Local environment. The unit tests expect its origin, http on localhost, and
# the walk-through needs no stack, so the other environments have nothing of their own
# to prove here.
set -eu

target="${1:?usage: test.sh <CampfireTests|CampfireUITests>}"

here=$(cd "$(dirname "$0")" && pwd)
cd "$here/../../apps/apple"

# Resolved into a variable rather than substituted into the -destination word, because
# `set -e` acts on a failed assignment but ignores a failed substitution inside an
# argument, which would hand xcodebuild an empty device name instead of simulator.sh's
# own message about why there is no simulator.
device=$(sh "$here/simulator.sh")

exec xcodebuild test \
  -project Campfire.xcodeproj \
  -scheme 'Campfire Local' \
  -configuration 'Local (Debug)' \
  -destination "platform=iOS Simulator,name=$device" \
  -derivedDataPath .build \
  -skipMacroValidation \
  -skipPackagePluginValidation \
  -only-testing:"$target"
