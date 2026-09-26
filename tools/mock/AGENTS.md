# The mock back-end

Read the [root `AGENTS.md`](../../AGENTS.md) first. This file is what is true only of `tools/mock`, the stand-in for the whole back-end on a developer's machine ([ADR 021](../../docs/decisions/021-develop-against-a-mock-back-end.md)). How it is used is the guidebook's [mock page](../../docs/guidebook/testing/mock.md).

It serves `wsj27-auth-api` under `/api/auth`, `wsj27-project-api` under `/api/project`, a ScoutID stand-in under `/__mock__/scoutid`, and a control surface under `/__mock__`. The two service prefixes are the ones the deployed ingress serves, so an address that works here works against dev unchanged ([ADR 012](../../docs/decisions/012-run-campfire-in-three-environments-on-one-origin.md)). It ships to nobody, and it defines nothing – **it copies what the services' code does**.

## Layout

```text
tools/mock/
├── src/
│   ├── main.ts        listens on 8003 – the only file that starts anything
│   ├── app.ts         createApp(), every route, importable without listening
│   ├── auth/          wsj27-auth-api
│   ├── project/       wsj27-project-api
│   ├── scoutid/       the ScoutID stand-in and the persona picker
│   ├── control/       the control surface
│   ├── testing/       a cookie-keeping browser and a hand-moved clock, for the tests
│   └── *.ts           what both services share – FastAPI's wire habits, JWTs, the key, the settings
├── seed/              the personas, the list of participants, and the units
└── static/            files copied from elsewhere
```

- Built on Hono, with no workspace dependencies. Node runs `src/main.ts` directly by stripping types, so there is no build step.
- Every relative import carries its `.ts` extension, because Node resolves the specifier as written. ESLint's `import-x/extensions` catches a missing one.
- No `console` – write to `process.stdout` or `process.stderr`.
- `main.ts` is the only file with a top-level side effect, so a test drives `createApp()` in process.
- `static/refresh.js` is the auth service's own file, ignored by ESLint and Prettier. Replace it when the service changes it; never edit it here.
- `static/bravelyscript.woff2` is a copy of the display face, so the persona picker wears the contingent's type without a workspace dependency.

## Running it

- `pnpm start:mock` runs it alone on 8003. Signing in works only through `http://localhost:8000`, because the auth service's public URL and redirect allowlist name that origin.
- `pnpm start:local` runs it behind Caddy on `:8000`, where [`config/environments/local/Caddyfile`](../../config/environments/local/Caddyfile) proxies the three prefixes to it. Nothing talks to 8003 except Caddy.
- `scripts/start/local.sh` reports the environment up only once `/__mock__/state` answers both on the port and through Caddy.
- The dev and prod environments run the real services instead, behind the same paths.

## The contract

**Copy the services' code, not a description of it.** Every route answers as the service's source does – the status, the body byte for byte, the headers, and the cookies – including what FastAPI and Starlette answer on its behalf: pydantic's 422 bodies, JSON 404s and 405s, the no-cache headers, and cookies quoted the way Python quotes them. The files follow the services' modules, so a change in a service is a change in the file beside its name:

| Mock                                                                       | The service's code                                                                        |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/auth/browser.ts`, `machine.ts`, `cookies.ts`, `tokens.ts`, `roles.ts` | `wsj27-auth-api`: `routes.py`, `cookies.py` and `constants.py`, `tokens.py`, `roles.py`   |
| `src/project/authentication.ts`, `participants.ts`, `role-map.ts`          | `wsj27-project-api`: `authenctication.py`, `participants.py`, and the route in `roles.py` |
| `src/project/roles.ts`, `participants-list.ts`                             | `wsj27-project-api`: the minting in `roles.py`, and `scoutnet_forms.py`                   |
| `src/settings.ts`                                                          | The auth service's environment in `config/environments/dev/compose.yaml`                  |
| `seed/participants/forms.ts`                                               | `wsj27-project-api`: `src/app/forms_template.json`, copied whole                          |
| `static/refresh.js`                                                        | `wsj27-auth-api`: `static/refresh.js`, copied verbatim                                    |

- **`/api/auth`** serves every route the auth service serves. The access token is a real RS256 JWT in the service's claim shape, signed with a key made at start and published at `certs`, with the service's cookie lifetimes.
- **The settings are the dev environment's**, not the service's defaults: the public URL on `localhost:8000`, redirects only there, no `Secure` flag, and no service-account secrets, so `token` refuses every client.
- **One hop is skipped.** The auth service polls the project API's role map over HTTP; the mock reads it in process, once, because the seed cannot change while it runs.
- **`/api/project`** serves the service's participant routes, and `scoutnet/refresh` answers `null`. The cases service is absent, as it is wherever `wsj27-project-api` runs without a database. Every route verifies the auth service's token from its cookie or a bearer header, with the service's leeway and no issuer or audience check.
- **`/__mock__/scoutid`** is the one part that is not a copy, because ScoutID is not ours. It is shaped like the Keycloak realm it replaces – its own idle and maximum session, a short-lived code checked against its PKCE challenge, refresh tokens that die with the session, and an end-session endpoint. Its sign-in page is the persona picker.

**Scope every answer exactly as the service does.** An avdelningsledare reads their own troop at any level and nothing else. Kontingentledning reads everyone at `basic`, and at `full` only with a health grant – 403, never a quietly downgraded 200. No access answers 404, indistinguishable from a record that does not exist, so membership never leaks through the difference. A leader's own contact details and health answers go only to kontingentledning with a health grant. `troopinfo` authorizes before it looks a troop up; `individual` looks first, because the person's troop decides the answer.

**Roles are minted, never written down.** A persona carries no roles. The project API mints them from each row of the list of participants – `wsj27:al:<unit>`, `wsj27:cmt:<function>:<role>` from the CMT roster, and `wsj27:access:<level>` – and the auth service puts them in the token. A check is a segment-wise prefix match, so `wsj27:cmt:admin:fa` satisfies `wsj27:cmt` while `wsj27:cmtx` satisfies nothing. A new role starts in the real service, never here.

**ScoutID's session outlives the auth service's cookies.** While it lives, a login goes straight through without the picker. Signing out ends it, which is how a developer switches persona – exactly as the real flow works.

**Nothing reaches disk.** Sessions live in memory and the key is made at start, so a restart signs everyone out. The clock is injectable, so a test ages a token without waiting.

## The seed

**A seed is data, not a special case.** Each persona is a file under `seed/personas/`, there for a case rather than for numbers, and listed for the picker in `seed/personas/index.ts` with a description of the case it covers. Add a persona by adding a file and listing it, and by giving them a row in the list of participants if they are in the contingent – never by branching in a route.

- `seed/units.ts` seeds two units, because a leader's boundary needs a unit on each side. Their real names and glyphs come from the web application's own unit identities, not from the mock.
- `seed/participants/participants.ts` is the list before the service decodes it, every answer keyed by its question. The ledare and kontingentledning rows carry the personas' identities, so a signed-in persona holds the roles their row mints. The holes – a missing mobile number, a missing scout group – are deliberate.
- `seed/participants/cmt-roles.csv` is the CMT roster in the columns the service's own tooling writes, so the service's slug rules run on it.
- `src/project/participants-list.ts` walks the form template rather than the answers, so an answer the template does not carry never reaches the wire.
- `max-lines` is off for `seed/**`, because a row carries a whole registration form.

## The control surface

`/__mock__` is namespaced so it never collides with a real path, and it holds two routes:

- `POST /__mock__/reset` forgets every ScoutID session, code, and token.
- `GET /__mock__/state` reports the live sessions by email and the roles each one's next token carries, never tokens.

Keep it to that. A control surface that grows features is a second API to maintain.

## Tests

Tests are `*.test.ts` beside the sources, in the `mock` Vitest project ([ADR 022](../../docs/decisions/022-test-typescript-with-vitest.md)). They drive the routes through `createApp()` with a shared key, a hand-moved clock, and the cookie-keeping browser, so nothing binds a port.

A stand-in that drifts from the contract is worse than none, so the coverage ratchet measures all of `src/` except `main.ts`. The tests pin the exact bytes the services send, so a service change the mock has not followed shows up as a disagreement with a test. The web application's modules and the Playwright walks run against the mock, so a change to a route's shape here is a change there too.
