#!/bin/sh
# What every start script needs in order to be trusted: a port is freed before it is
# taken, a process is reported as running only once it answers, and everything started
# is stopped together on Ctrl+C or the first failure. Sourced, never run.
#
# macOS is the target, because the shells' toolchains exist only there and continuous
# integration runs no start script, so lsof, ps, curl, and sed are the system's own.
#
# Every function prints for a person at the terminal, and none is quiet about killing a
# process – a server that vanished with no explanation is worse than a busy port.

# The repository root, so a sourcing script can run from anywhere.
repository=$(cd "$(dirname "$0")/../.." && pwd)

# The processes the script started, as "name:pgid" pairs. Each runs in a process group
# of its own, so one signal stops everything under it – pnpm, the node it spawned, and
# the sed prefixing its output.
processes=""

die() {
  echo >&2
  echo "$*" >&2
  exit 1
}

# The pids listening on a TCP port. Empty when the port is free.
listeners() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null | sort -u
}

pgid_of() {
  ps -o pgid= -p "$1" 2>/dev/null | tr -d ' '
}

describe() {
  ps -o command= -p "$1" 2>/dev/null | cut -c1-100
}

# Stop whatever listens on a port, and say what it was – an earlier run, a server a
# crashed terminal left behind, or a node whose wrapper died. Docker's port proxy is the
# exception, because the containers behind it hold the port, so they are what is stopped.
free_port() {
  name=$1
  port=$2
  pids=$(listeners "$port")
  [ -z "$pids" ] && return 0

  for pid in $pids; do
    command=$(describe "$pid")
    case "$command" in
      *com.docker*)
        echo "Port $port ($name) is held by Docker – stopping the dev and prod environments' containers."
        # A name of its own, because POSIX sh has no `local` and a caller still reads its
        # own `environment` after this returns.
        for compose_environment in dev prod; do
          docker compose --file "$repository/config/environments/$compose_environment/compose.yaml" \
            down >/dev/null 2>&1 || true
        done
        ;;
      *)
        echo "Port $port ($name) is taken by pid $pid – stopping it."
        echo "  $command"
        kill -TERM "$pid" 2>/dev/null || true
        ;;
    esac
  done

  wait_for_port_to_free "$port" 50 && return 0

  echo "Still listening on $port after five seconds – killing."
  for pid in $(listeners "$port"); do
    kill -KILL "$pid" 2>/dev/null || true
  done
  wait_for_port_to_free "$port" 20 || die "Port $port could not be freed. Look at: lsof -nP -iTCP:$port"
}

# Polls in tenths of a second, up to the count given.
wait_for_port_to_free() {
  port=$1
  tries=$2
  while [ -n "$(listeners "$port")" ]; do
    tries=$((tries - 1))
    [ "$tries" -le 0 ] && return 1
    sleep 0.1
  done
  return 0
}

# Start a command in a process group of its own, every line of its output prefixed
# with its name so servers sharing a terminal stay readable. `set -m` gives each
# background job its own group, which also keeps the terminal's Ctrl+C from reaching
# the children directly, so the trap is the one place that stops them, with a report.
start_process() {
  name=$1
  shift
  set -m
  # `sed -l` is macOS's line-buffered flag; GNU sed spells it -u.
  "$@" </dev/null 2>&1 | sed -l "s/^/[$name] /" &
  set +m
  pgid=$(pgid_of "$!")
  processes="$processes $name:$pgid"
}

# Whether a started process is still alive.
is_running() {
  kill -0 -- "-$1" 2>/dev/null
}

# Block until a URL answers – any HTTP status counts, because a 502 from Caddy still
# means Caddy is up. Fails fast when the process behind the URL has already died, and
# after the timeout otherwise, so a server that never comes up is a failure rather than
# a terminal that sits there.
wait_for() {
  name=$1
  url=$2
  limit=${3:-60}
  pgid=""
  for entry in $processes; do
    [ "${entry%%:*}" = "$name" ] && pgid=${entry#*:}
  done

  printf '%s' "Waiting for $name at $url "
  waited=0
  until curl -s -o /dev/null --max-time 2 "$url"; do
    if [ -n "$pgid" ] && ! is_running "$pgid"; then
      die "$name stopped before it answered – its output is above."
    fi
    waited=$((waited + 1))
    [ "$waited" -ge "$limit" ] && die "$name did not answer within ${limit}s – its output is above."
    printf '.'
    sleep 1
  done
  echo " up"
}

# Like `wait_for`, but only a 2xx will do – for the check through the front door, where
# a 502 would mean the proxy is up and the application is not.
wait_for_ok() {
  name=$1
  url=$2
  limit=${3:-60}
  printf '%s' "Waiting for $name at $url "
  waited=0
  until curl -sf -o /dev/null --max-time 2 "$url"; do
    waited=$((waited + 1))
    [ "$waited" -ge "$limit" ] && die "$name did not answer 2xx at $url within ${limit}s."
    printf '.'
    sleep 1
  done
  echo " ok"
}

# Like `wait_for`, but a 5xx does not count – for a back-end behind a proxy that answers
# 502 on its own behalf until the back-end starts. `wait_for` would take that 502 as an
# answer, and `wait_for_ok` never passes a back-end whose healthy reply is a 401.
wait_for_backend() {
  name=$1
  url=$2
  limit=${3:-60}
  printf '%s' "Waiting for $name at $url "
  waited=0
  while :; do
    # curl writes 000 as the status even when it fails, so a fallback of its own would
    # make a timed-out probe report "000000".
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "$url" || true)
    [ "$code" -ge 100 ] && [ "$code" -lt 500 ] && break
    waited=$((waited + 1))
    [ "$waited" -ge "$limit" ] && die "$name did not answer within ${limit}s – the last status through the proxy was $code."
    printf '.'
    sleep 1
  done
  echo " up ($code)"
}

# Stop everything `start_process` started: TERM to each group, a few seconds' grace,
# then KILL for whatever ignored it. Runs from the trap, so it is idempotent and never
# exits early.
stop_processes() {
  [ -z "$processes" ] && return 0
  echo
  for entry in $processes; do
    name=${entry%%:*}
    pgid=${entry#*:}
    if is_running "$pgid"; then
      echo "Stopping $name."
      kill -TERM -- "-$pgid" 2>/dev/null || true
    fi
  done
  tries=50
  while [ "$tries" -gt 0 ]; do
    alive=0
    for entry in $processes; do
      is_running "${entry#*:}" && alive=1
    done
    [ "$alive" -eq 0 ] && break
    tries=$((tries - 1))
    sleep 0.1
  done
  for entry in $processes; do
    pgid=${entry#*:}
    if is_running "$pgid"; then
      echo "${entry%%:*} ignored TERM – killing."
      kill -KILL -- "-$pgid" 2>/dev/null || true
    fi
  done
  processes=""
}

# Keep the script in the foreground until Ctrl+C, or until one of the processes dies
# on its own – in which case the rest are stopped too and the exit code says so.
supervise() {
  while :; do
    for entry in $processes; do
      if ! is_running "${entry#*:}"; then
        die "${entry%%:*} stopped unexpectedly – its last output is above. Everything else is being stopped."
      fi
    done
    sleep 1
  done
}

# The EXIT handler. INT and TERM exit through it, so stopping happens once whichever
# way the script ends – Ctrl+C, a `die`, or the end of the script.
on_exit() {
  status=$?
  trap - INT TERM EXIT
  stop_processes
  echo "Stopped."
  exit "$status"
}

# Arms the trap. Ctrl+C is how a dev server is meant to end, so it exits 0, because the
# conventional 130 would have pnpm print an ELIFECYCLE failure banner over the "Stopped."
# it just printed.
# TERM keeps its code, because that is somebody else stopping the script.
arm_trap() {
  trap on_exit EXIT
  trap 'exit 0' INT
  trap 'exit 143' TERM
}
