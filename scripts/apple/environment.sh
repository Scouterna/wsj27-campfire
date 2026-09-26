#!/bin/sh
# Map an environment word to the name Xcode knows it by.
#
# Xcode names the scheme "Campfire <name>" and the configuration "<name> (Debug)", so
# every script derives both from one word. Defaults to `local`.
#
# Usage:
#   environment.sh [local|dev|prod]   ->  prints "Local", "Dev", or "Prod"

set -eu

case "${1:-local}" in
  local) printf 'Local' ;;
  dev) printf 'Dev' ;;
  prod) printf 'Prod' ;;
  *)
    echo "Unknown environment: $1" >&2
    echo "Expected one of: local, dev, prod." >&2
    exit 1
    ;;
esac
