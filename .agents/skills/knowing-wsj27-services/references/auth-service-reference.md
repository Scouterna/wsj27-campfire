# Auth Service Reference

`wsj27-auth-api` – a small OIDC front end in Python and FastAPI. It runs the browser sign-in round trip against ScoutID, then re-signs the identity with WSJ27's roles in a token of its own. It owns no project data.

## Contents

- [Routes](#routes)
- [Cookies](#cookies)
- [The token](#the-token)
- [Refresh](#refresh)
- [Roles](#roles)
- [Service accounts](#service-accounts)
- [Configuration](#configuration)

## Routes

Served at the service's root; the ingress adds and strips `/api/auth`.

| Route                                   | What it does                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `GET /login?redirect_uri`               | Starts sign-in with PKCE and redirects to ScoutID. 400 when the redirect host is not allowed.                                   |
| `GET /callback`                         | Redeems the code, sets the session cookies, and redirects back. 400 on a bad state; 502 when ScoutID's exchange fails.          |
| `GET /refresh`                          | Mints fresh cookies from the refresh token, with roles recomputed. 401 when the session is over, which also clears the cookies. |
| `GET /user`                             | The signed-in person: names, email, picture, member number, and roles. 401 when signed out.                                     |
| `GET /logout?redirect_uri`              | Clears every cookie and ends the ScoutID session too, when it holds the ID token to do so.                                      |
| `POST /token`                           | The client-credentials grant for machine callers. 401 for an unknown client or a wrong secret, indistinguishably.               |
| `GET /certs`                            | The service's own public keys.                                                                                                  |
| `GET /.well-known/openid-configuration` | Discovery for the service itself, not for ScoutID – it signs every token, so it describes itself.                               |
| `GET /static/refresh.js`                | The refresh script a page embeds.                                                                                               |
| `GET /`                                 | Health, and the state of the role cache.                                                                                        |

Every response carries no-cache headers, so no proxy or browser holds session state.

## Cookies

Every cookie is prefixed `wsj27-auth_`, scoped to `/`, `SameSite=Lax`, and `Secure` outside local HTTP.

- `access-token` – the service's own JWT, httpOnly
- `refresh-token` and `id-token` – ScoutID's, httpOnly; the ID token is kept to end the ScoutID session on sign-out
- `expires-at` – when the access token expires, in milliseconds, readable by scripts so a page can schedule its refresh
- `refresh-expires-at` – when the refresh window closes, httpOnly
- The sign-in round trip's own cookies – the PKCE verifier, the state, and the return address – live half an hour and are dropped once the code is redeemed.

## The token

An RS256 JWT the service signs itself, with the audience `wsj27` by default.

- **Identity claims** are copied from ScoutID – `sub`, the names, `preferred_username`, `email`, `locale`, `picture` – plus `member_no`, normalized under one name.
- **Roles** use Keycloak's own claim shape so standard consumers read them unchanged. A role without a colon goes in `realm_access.roles`. A role with one is split at the first colon – `wsj27:al:38` becomes `resource_access.wsj27.roles` holding `al:38` – and reassembles losslessly.
- **Verify** by discovering from the service's base URL, following `jwks_uri`, checking RS256, `iss`, and `aud`. Never hardcode the key.
- The token is signed, not encrypted, so anyone holding it can read its claims.
- A revoked role stays in a live token until it expires, at most one access-token lifetime.

## Refresh

The access token lives five minutes by default. The refresh window follows ScoutID's own refresh lifetime, which lasts as long as ScoutID's session.

`refresh.js` reads `expires-at` and refreshes about a minute before expiry. It retries with backoff on failure, stops only on a definite 401, and checks again when a tab becomes visible or returns from the back-forward cache, since a backgrounded tab's timer fires late.

## Roles

The service carries roles and never decides them. It polls the participants service's role map on a timer, hourly by default, with `If-None-Match` so an unchanged map costs a 304. The first fetch starts only once the service is serving, because the participants service verifies that call against this service's own keys.

- A lookup never waits on the network. With a cold cache or the participants service down, sign-in still works, with the default roles – none unless configured.
- The member number comes from ScoutID's member-number claim, or is parsed from `preferred_username`. Failing both, the person gets no roles, and the service logs it loudly.

## Service accounts

A machine caller authenticates with a client id and secret at `/token` and gets a token of the same shape as a user's, with the roles configured for that client and no refresh – it asks again. The service mints one for itself to read the role map, which needs the `wsj27:bulkread` role.

## Configuration

| Variable                                              | Meaning                                                                                                              |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_URL`                                          | The external base URL, path prefix included. Every issued URL is built from it, never from the incoming request.     |
| `ALLOWED_REDIRECT_DOMAINS`                            | The hosts sign-in and sign-out may return to                                                                         |
| `OIDC_SERVER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` | The ScoutID realm and this service's client in it                                                                    |
| `SIGNING_KEY`, `SIGNING_KEY_PREVIOUS`                 | The signing key, and a verify-only previous key so a rotation keeps live sessions                                    |
| `AUDIENCE`, `ACCESS_TOKEN_TTL_SECONDS`                | The audience claim, and the access token's lifetime                                                                  |
| `PROJECT_API_URL`, `ROLE_SYNC_INTERVAL_MINUTES`       | Where to fetch the role map – an in-cluster address, never through the ingress – and how often                       |
| `SERVICE_CLIENT_ROLES`, `SERVICE_CLIENT_SECRETS`      | The machine callers, their roles and secrets kept apart                                                              |
| `DEFAULT_ROLES`                                       | The roles for anyone missing from the role map                                                                       |
| `FAKE_USER_ID`, `STUB_ROLES_FILE`, `INSECURE_COOKIES` | Local development only – sign in without ScoutID, roles from a file, and cookies without `Secure`                    |
| `ROOT_PATH`                                           | Only for the generated API docs' links. It does not affect redirects – confusing it with `PUBLIC_URL` is a real trap |
