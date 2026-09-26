#!/bin/sh
# The dev and prod environments, in one command: generates the signing key on first run
# and brings the containers up behind http://localhost:8000.
#
# The environment is the first argument – dev or prod, dev when there is none. It selects
# the folder under config/environments/, and that folder is the whole difference – dev
# serves the web from Vite, prod from the built image.
#
# `--user-id <memberNo>` (dev only) fakes the sign-in. The auth service signs every login
# straight in as that member, with no ScoutID round trip, while the roles still come from
# the list of participants – so the session is real everywhere but the identity screens.
# `--roles <csv>` grants roles to a member the list of participants does not know. Prod
# stays real, because it exists to prove the artifact as deployed.
#
# Whatever holds port 8000 is stopped and named. The stack is reported as up only once
# the web application and the back-end services answer through the ingress, and Ctrl+C
# takes the containers down rather than leaving them stopped.
#
# The credentials live in the environment's own gitignored .env, which you write and this
# never overwrites or prints. On a machine that has none, the first run says what to write.
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

# prod runs the artifact rather than building one, so the image has to exist first.
if [ "$environment" = "prod" ] && ! docker image inspect wsj27-campfire >/dev/null 2>&1; then
  echo "No wsj27-campfire image – build it first:" >&2
  echo "  pnpm build:image" >&2
  exit 1
fi

# Without the Keycloak client nobody can sign in, and without the Scoutnet keys the
# project API refuses to start.
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
# Every run, so a key written with looser permissions is tightened too – a private key
# readable by anything on the machine is not private.
chmod 600 signing-key.pem

# The fake sign-in file is rewritten every run – written with the flag, removed without
# it – so a faked user never survives into the next plain start. The identity is only a
# placeholder, because the roles come from the list of participants by member number.
# A full identity belongs in your .env as FAKE_USER_ID when the name on the greeting
# matters.
rm -f fake-user.env
if [ -n "$user_id" ]; then
  printf 'FAKE_USER_ID={"name": "Testperson %s", "preferred_username": "scoutnet|%s"}\n' \
    "$user_id" "$user_id" > fake-user.env
  echo "Fake sign-in: every login lands as member $user_id, without ScoutID."
  if [ -n "$user_roles" ]; then
    # DEFAULT_ROLES reach only a member the list of participants does not know, so they
    # decide the session only for a member number outside it.
    printf 'DEFAULT_ROLES=%s\n' "$user_roles" >> fake-user.env
    echo "Fake roles: a member the list of participants does not know signs in with $user_roles."
  fi
fi

# Exported rather than written to the .env, so that file stays yours. The service reads a
# PEM as \n escapes, and compose substitutes this into the auth service's environment.
CAMPFIRE_SIGNING_KEY=$(awk 'NR>1{printf "\\n"} {printf "%s", $0}' signing-key.pem)
export CAMPFIRE_SIGNING_KEY

# An earlier run of this environment is taken down before the port check, because its
# running containers hold 8000.
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

# The auth service boots on its own schedule and answers 401 without a session. Without
# this wait, prod reports ready the moment the image serves, and the first sign-in meets
# the ingress's 502.
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
