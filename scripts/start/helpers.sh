#!/bin/sh
# What every start script needs in order to be trusted: a port is freed before it is
# taken, a process is only reported as running once it answers, and everything started
# is stopped together on Ctrl+C or the first failure. Sourced by the scripts beside it, never run.
#
# macOS is the target: the shells' toolchains only exist here, and continuous
# integration never runs a start script. lsof, ps, curl, and sed are all the system's
# own.
#
# Every function prints for a person, on the terminal that ran the script. Nothing here
# is quiet about killing a process – a server that vanished with no explanation is worse
# than a port that was busy.

# The repository root, so a sourcing script can run from anywhere.
repository=$(cd "$(dirname "$0")/../.." && pwd)

# The processes this script started, as "name:pgid" pairs. Each runs in a process group
# of its own (see `start_process`), so stopping one stops everything under it – pnpm,
# the node it spawned, and the sed prefixing its output – with one signal.
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

# Stop whatever listens on a port, and say what it was. A previous run of a start
# script, a server left behind by a crashed terminal, a Storybook whose wrapper died
# but not its node – all of these end the same way. Docker's port proxy is the one
# exception: the containers hold the port, so they are what is stopped.
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
        # A name of its own, because POSIX sh has no `local`: a bare `environment` here
        # would overwrite the caller's, and dev.sh reads its own after this returns.
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
# with its name so three servers on one terminal stay readable. `set -m` is what gives
# each background job its own group – and, as a consequence, keeps the terminal's
# Ctrl+C from reaching the children directly: the trap below is the one place that
# stops them, in order, with a report.
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

# Like `wait_for`, but a 5xx does not count. Between the two there is a case neither
# covers: a backend reached through a proxy, where the proxy answers 502 on its own
# behalf until the backend starts. `wait_for` takes that 502 as an answer and reports up;
# `wait_for_ok` never passes, because the backend's healthy reply is a 401. This waits
# for any status the backend itself produced.
wait_for_backend() {
  name=$1
  url=$2
  limit=${3:-60}
  printf '%s' "Waiting for $name at $url "
  waited=0
  while :; do
    # curl writes its %{http_code} – 000 – even when it fails, so the fallback adds
    # nothing: `|| echo 000` would make a timed-out probe report "000000".
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
# Everything running is the only state this script ever reports as running.
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

# Arms the trap. INT and TERM exit through the EXIT handler, so stopping happens once
# whichever way the script ends – Ctrl+C, a `die`, or the end of the script.
on_exit() {
  status=$?
  trap - INT TERM EXIT
  stop_processes
  echo "Stopped."
  exit "$status"
}

# Ctrl+C is how a dev server is meant to end, so it exits 0: the 130 convention would
# have pnpm print an ELIFECYCLE failure banner over the "Stopped." that just said
# everything went as asked. TERM keeps its code – that is somebody else stopping us.
arm_trap() {
  trap on_exit EXIT
  trap 'exit 0' INT
  trap 'exit 143' TERM
}
