#!/bin/sh
# The dev and prod environments, in one command: generates the signing key on first run
# and brings the containers up behind http://localhost:8000.
#
# The environment is the first argument – dev or prod, dev when there is none. It selects the
# folder under config/environments/, and that folder is the whole difference: dev serves
# the web from Vite, prod from the built image. Called by `pnpm start:dev` and
# `pnpm start:prod`.
#
# `--user-id <memberNo>` (dev only) fakes the sign-in: the auth service signs every
# /login straight in as that member, with no ScoutID round trip, while the roles are
# still minted from the register – so the session is real everywhere but the identity
# screens. `--roles <csv>` adds the auth service's DEFAULT_ROLES on top, granted to any
# member the register does not know – fake a number outside the register and the
# session wears exactly the hats the flag names. Prod stays real on purpose: it exists
# to prove the artifact as deployed.
#
# Whatever holds port 8000 first – the local environment's Caddy, or this one's own
# containers from an earlier run – is stopped and named. The stack is reported as up only once
# the ingress answers and the web application answers through it; Ctrl+C takes the
# containers down rather than leaving them stopped.
#
# The credentials live in the environment's own .env, which you write and this never
# overwrites – the Keycloak client for the auth service, and the Scoutnet project keys
# for the project API. It is gitignored, and it is the only place credentials belong.
# On a machine that has none, the first run says exactly what to write.
#
# Secret values never pass through this script; nothing prints them.
set -eu

environment="dev"
user_id=""
user_roles=""
while [ $# -gt 0 ]; do
  case "$1" in
    dev | prod)
      environment="$1"
      ;;
    --user-id)
      if [ $# -lt 2 ]; then
        echo "--user-id needs a Scoutnet member number." >&2
        exit 1
      fi
      shift
      user_id="$1"
      ;;
    --roles)
      if [ $# -lt 2 ]; then
        echo "--roles needs a comma-separated role list, like wsj27:cmt:admin." >&2
        exit 1
      fi
      shift
      user_roles="$1"
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Expected an environment (dev or prod), optionally with --user-id <memberNo>." >&2
      exit 1
      ;;
  esac
  shift
done

case "$user_id" in
  *[!0-9]*)
    echo "--user-id takes a Scoutnet member number, digits only – got: $user_id" >&2
    exit 1
    ;;
esac

if [ -n "$user_id" ] && [ "$environment" = "prod" ]; then
  echo "--user-id fakes the sign-in and is for dev only – prod proves the real flow." >&2
  exit 1
fi

if [ -n "$user_roles" ] && [ -z "$user_id" ]; then
  echo "--roles belongs to a faked sign-in – pass --user-id <memberNo> with it." >&2
  exit 1
fi

# shellcheck source=scripts/start/helpers.sh
. "$(dirname "$0")/helpers.sh"
cd "$repository/config/environments/$environment"

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running – start Docker Desktop first." >&2
  exit 1
fi

# prod runs the artifact rather than building one, so it has to exist first – and a
# stale image is worse than a missing one, because it looks like it worked.
if [ "$environment" = "prod" ] && ! docker image inspect wsj27-campfire >/dev/null 2>&1; then
  echo "No wsj27-campfire image – build it first:" >&2
  echo "  pnpm build:image" >&2
  exit 1
fi

# The credentials are yours to write, once, and nothing here touches the file after
# that. Both halves matter: without the Keycloak client nobody can sign in, and
# without the Scoutnet keys the project API refuses to start at all.
if [ ! -f .env ]; then
  echo "No credentials for the $environment environment." >&2
  echo >&2
  echo "Write config/environments/$environment/.env with:" >&2
  echo "  OIDC_SERVER=<the ScoutID realm, e.g. https://dev.id.scouterna.se/realms/scoutnet>" >&2
  echo "  OIDC_CLIENT_ID=<a client that accepts http://localhost:8000/api/auth/callback>" >&2
  echo "  OIDC_CLIENT_SECRET=<its secret>" >&2
  echo "  SCOUTNET_PROJECTS=<the WSJ27 project's Scoutnet API config, one JSON line>" >&2
  echo "  SCOUTNET_BODYLIST_KEY=<optional, for the scout-group names>" >&2
  echo >&2
  echo "The values are the same ones the deployed services run with – ask whoever" >&2
  echo "operates them. The file is gitignored, it is yours, and nothing here will" >&2
  echo "overwrite it." >&2
  exit 1
fi

# A throwaway key for local tokens, generated once. A leaked dev key would let anyone
# mint "valid" local sessions, so it is gitignored and readable only by its owner.
if [ ! -f signing-key.pem ]; then
  (umask 077 && openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out signing-key.pem 2>/dev/null)
fi
# Every run, not only on the run that created it: a key written before this line existed
# is still on disk, and a private key readable by anything on the machine is not one.
chmod 600 signing-key.pem

# The fake sign-in file is rewritten every run – written with the flag, removed without
# it – so a faked user can never survive into the next plain start. The identity is a
# placeholder: the roles come from the register by member number either way, and a full
# identity belongs in your .env as FAKE_USER_ID when the name on the greeting matters.
rm -f fake-user.env
if [ -n "$user_id" ]; then
  printf 'FAKE_USER_ID={"name": "Testperson %s", "preferred_username": "scoutnet|%s"}\n' \
    "$user_id" "$user_id" > fake-user.env
  echo "Fake sign-in: every login lands as member $user_id, without ScoutID."
  if [ -n "$user_roles" ]; then
    # DEFAULT_ROLES reach any member the register's role map does not know, so they
    # only decide the session when the member number is outside the register – a
    # registered member's real roles win the moment the map loads.
    printf 'DEFAULT_ROLES=%s\n' "$user_roles" >> fake-user.env
    echo "Fake roles: a member the register does not know signs in with $user_roles."
  fi
fi

# Exported rather than written to the .env, so that file stays yours. The service reads a
# PEM as \n escapes, and compose substitutes this into the auth service's environment.
CAMPFIRE_SIGNING_KEY=$(awk 'NR>1{printf "\\n"} {printf "%s", $0}' signing-key.pem)
export CAMPFIRE_SIGNING_KEY

# An earlier run of this mode is taken down whole, containers and all, before the
# port check – a stopped container still owns nothing, but a running one owns 8000.
docker compose down >/dev/null 2>&1 || true
free_port ingress 8000

# The containers outlive this script by design, so the trap takes them down rather
# than signaling a process group – nothing here went through `start_process`.
down() {
  status=$?
  trap - INT TERM EXIT
  echo
  echo "Taking the containers down."
  docker compose down
  echo "Stopped."
  exit "$status"
}
trap down EXIT
trap 'exit 0' INT
trap 'exit 143' TERM

docker compose up --build --detach

wait_for ingress http://localhost:8000/ 60
# In dev the web container installs the workspace before it serves, which is a while on
# the first run; in prod the image is already built. Only a 2xx through the ingress
# means the application is really there.
wait_for_ok "the web through the ingress" http://localhost:8000/ 600

# And the auth service, which boots on its own schedule. It answers 401 to an
# unauthenticated request, and a 401 means it is there – so this waits for any status the
# service itself produced, not for the ingress's own 502. Without it the prod environment
# reports ready the moment the image serves, which is immediately, and the first sign-in
# attempt meets a 502 from a proxy whose backend has not started.
wait_for_backend "the auth service through the ingress" http://localhost:8000/api/auth/user 120

# The project API answers its health check without authentication, so any status it
# produced means it is up – it fetches Scoutnet data during startup, which takes a
# while on a cold cache.
wait_for_backend "the project API through the ingress" http://localhost:8000/api/project/ 300

echo
echo "Campfire $environment: http://localhost:8000"
echo "Ctrl+C takes the containers down."
echo

docker compose logs --follow
