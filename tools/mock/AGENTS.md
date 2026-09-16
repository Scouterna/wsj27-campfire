# The mock back-end

Read the [root `AGENTS.md`](../../AGENTS.md) first – it holds the conventions that apply everywhere. This file is what is true of `tools/mock`, the back-end stand-in under `tools/` – development tooling that ships to nobody. Why it exists is [ADR 021](../../docs/decisions/021-stand-in-for-the-back-end-with-a-seeded-mock.md), and the guidebook's [mock page](../../docs/guidebook/testing/mock.md) describes how it is used.

The mock stands in for the whole back-end on a developer's machine: `wsj27-auth-api` under `/api/auth`, `wsj27-project-api` under `/api/project`, a stand-in for ScoutID under `/__mock__/scoutid`, and a control surface under `/__mock__` so a test can put the stack back to a known state. It is what makes the local environment work with nothing behind it, and what keeps every test off the network.

It is a development tool. It ships to nobody, it is not a fixture library, and it is not a design document for the real services – **it copies what their code does rather than defining anything**. The two service prefixes are the ones the deployed ingress serves ([ADR 012](../../docs/decisions/012-run-campfire-in-three-environments-on-one-origin.md)), so an address that works here works against dev unchanged.

## What is in here

```text
tools/mock/
├── src/
│   ├── main.ts        listens on 8003 – the only file that starts anything
│   ├── app.ts         createApp() – every route, importable without listening
│   ├── auth/          wsj27-auth-api: the browser routes, the machine routes, cookies, tokens, roles
│   ├── project/       wsj27-project-api: token checks, the participant routes, role minting, the decoder
│   ├── scoutid/       the ScoutID stand-in: its sessions, codes, and tokens, and the persona picker
│   ├── control/       the control surface
│   ├── testing/       a browser that keeps cookies and a clock moved by hand, for the tests
│   └── *.ts           what both services share: FastAPI's wire habits, JWTs, the key, the settings
├── seed/              personas/ and participants/, and the units the picker groups by
└── static/            files copied in from elsewhere: the auth service's refresh.js, and the display face
```

The package is `@scouterna/wsj27-campfire-mock`, private, `"type": "module"`, built on Hono and `@hono/node-server`, and it depends on nothing else in the workspace. Its own `start` script is `node src/main.ts` – Node runs the TypeScript directly by stripping types, so there is no build step to keep in sync – and the root `pnpm start:mock` is what drives it.

- Every relative import carries its `.ts` extension. Node resolves the specifier as written, so a missing extension is a runtime failure rather than a bundler's problem, and `import-x/extensions` is set to `always` for `tools/**` in `eslint.config.ts` to catch it at lint time instead. Every type-only import is `import type`, which `verbatimModuleSyntax` requires repository-wide.
- ESLint is strict and type-aware here as everywhere, at `--max-warnings 0`: no `console`, so a message goes to `process.stdout` or `process.stderr`, and JSDoc on every export, with a description on every `@param` and `@returns`. A disable comment carries its reason after `--`.
- `static/refresh.js` is the auth service's code, not this repository's, so ESLint and Prettier both ignore it. Replace it with the service's file when that changes; never edit it here.
- `static/bravelyscript.woff2` is the design system's display face, copied from `libraries/ui/assets/fonts/` so the persona picker wears the contingent's own type. A copy rather than a dependency, because the mock depends on nothing in the workspace – and the face is the one asset that never changes.
- `main.ts` is the only file with a top-level side effect. Everything else is importable without starting anything, which is what lets a test drive `createApp()` in process.

## How it runs

- `pnpm start:mock` runs it alone on port 8003. Signing in works only through `http://localhost:8000`, because the auth service's public URL and its redirect allowlist name that origin – as they do in the dev environment.
- `pnpm start:local` runs it behind Caddy on `http://localhost:8000`, where [`config/environments/local/Caddyfile`](../../config/environments/local/Caddyfile) proxies `/api/auth/*`, `/api/project/*`, and `/__mock__/*` to it and sends everything else to the Vite dev server. The web application only ever sees the one origin ([ADR 012](../../docs/decisions/012-run-campfire-in-three-environments-on-one-origin.md)), and nothing talks to 8003 directly except Caddy.
- [`scripts/start/local.sh`](../../scripts/start/local.sh) waits on `/__mock__/state` twice – once on the port, once through Caddy – so the environment is reported up only when the mock answers where the application will look for it.
- The dev and prod environments do not use it. They run the real `wsj27-auth-api` and `wsj27-project-api` in containers, behind the same paths.

## The contract

**Copy the services' code, not a description of it.** Every route answers as the service's source answers it – the status, the body byte for byte, the headers, and the cookies – including what FastAPI and Starlette answer on the service's behalf: pydantic's 422 bodies, JSON 404s and 405s, the no-cache headers, and cookies quoted the way Python quotes them. The files follow the services' modules, so a change in a service is a change in the file beside its name:

| Mock                                                                       | The service's code                                                                        |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/auth/browser.ts`, `machine.ts`, `cookies.ts`, `tokens.ts`, `roles.ts` | `wsj27-auth-api`: `routes.py`, `cookies.py` and `constants.py`, `tokens.py`, `roles.py`   |
| `src/project/authentication.ts`, `participants.ts`, `role-map.ts`          | `wsj27-project-api`: `authenctication.py`, `participants.py`, and the route in `roles.py` |
| `src/project/roles.ts`, `participants-list.ts`                             | `wsj27-project-api`: the minting in `roles.py`, and `scoutnet_forms.py`                   |
| `src/settings.ts`                                                          | The auth service's environment in `config/environments/dev/compose.yaml`                  |
| `seed/participants/forms.ts`                                               | `wsj27-project-api`: `src/app/forms_template.json`, copied whole                          |
| `static/refresh.js`                                                        | `wsj27-auth-api`: `static/refresh.js`, copied verbatim                                    |

- **`/api/auth`** serves every route the auth service serves: `login`, `callback`, `refresh`, `user`, `logout`, `token`, `certs`, `.well-known/openid-configuration`, `static/refresh.js`, and the health check at its root. The access token is a real RS256 JWT in the service's claim shape, signed with a key the mock makes when it starts and published at `certs`. The session is the service's cookies with the service's lifetimes: a five-minute access token, and a refresh window that lasts as long as ScoutID's session does.
- **The settings are the dev environment's**, not the service's defaults where the two differ: the public URL `http://localhost:8000/api/auth`, redirects allowed only to `localhost:8000`, no `Secure` flag, and no service-account secrets, so `token` refuses every client.
- **One hop is skipped.** The auth service polls the project API's role map over HTTP every hour; the mock reads the same map in process, once, because the seeded list of participants cannot change while it runs.
- **`/api/project`** serves the health check, `participants/troopinfo/{troop}`, `participants/individual/{memberNo}`, the bulk `participants/roles` map, and `scoutnet/refresh`, which answers `null` because the seed is already all there is. There is no `/cases`, as there is none wherever the service runs without a database. Every route verifies the auth service's token from its cookie or a bearer header, with the service's thirty seconds of leeway and no issuer or audience check.
- **`/__mock__/scoutid`** is the one part that is not a copy, because ScoutID is not ours to run. It is shaped like the Keycloak realm it replaces: a session of its own that idles out after half an hour and ends after ten, a one-minute code checked against its PKCE challenge, refresh tokens that die with the session, and an end-session endpoint. Its sign-in page is the persona picker.

**Scope every answer exactly as the real service scopes it.** An avdelningsledare reads their own troop at any level and nothing else; kontingentledning reads everyone at `basic`, and at `full` only with a health grant – 403, never a quietly downgraded 200. No access at all answers 404, indistinguishable from a record that does not exist, because the list of participants must not leak membership through the difference. A leader's own contact details and health answers go only to kontingentledning with a health grant, so a leader reading their troop sees its young people in full and its leaders without those two fields. `troopinfo` authorizes before it looks a troop up; `individual` has to look first, because the person's own troop is what decides the answer.

**The roles are minted, never written down.** A persona carries no roles. The project API mints them from each row in the list of participants – `wsj27:al:<troop>` for a leader, `wsj27:cmt:<funktion>:<roll>` from the CMT roster for the management, and `wsj27:access:<level>` from a personal Accesstyp – and the auth service puts what the map holds for a member into their token. A check is a segment-wise prefix match in `src/project/authentication.ts`, so holding `wsj27:cmt:admin:fa` satisfies a requirement of `wsj27:cmt` while `wsj27:cmtx` satisfies nothing. A new role starts in the real service, never here.

**ScoutID's session outlives the auth service's cookies.** While it lives, a login goes straight back through ScoutID without the picker, and a silent login signs the same person in again. Signing out ends it, so the next login shows the picker – which is how a developer switches persona, exactly as the real flow works.

**Nothing reaches disk.** The stand-in's sessions live in memory and the signing key is made at start, so a restart signs everyone out and refuses every token minted before it. The clock is injectable, which is how a test ages a token or a session without waiting.

## The seed

**A seed is data, not a special case.** Personas live one per file under `seed/personas/`, twelve of them, each there for a case rather than for numbers: a leader in each of two units, the head of contingent, one person per management function, and three at the edges of the role rules – a personal health grant, a management member the roster does not name, and an outsider. They are grouped for the picker in `seed/personas/index.ts`, and each carries a description documenting the case it exists for – read in the seed, not shown anywhere: the picker reads each persona line from the roles the service mints for them, so what a row promises is what the session carries. Add a persona by adding a file and listing it there, and by giving them a row in the list of participants if they are in the contingent – never by branching in a route.

- `seed/units.ts` numbers the two units rather than naming them. Their names are secret until the units learn them, and this repository is public.
- `seed/participants/participants.ts` is the list of participants before the service decodes it: the units' leaders, deltagare, and IST, plus the contingent management, with every answer keyed by its question key. The ledare and kontingentledning rows carry the sign-in personas' identities, so a signed-in persona exists in the list of participants and holds the roles their row mints. The holes are deliberate – a missing mobile number, a missing scout group – because a real list of participants has them.
- `seed/participants/cmt-roles.csv` is the CMT roster in the columns the service's own tooling writes, the file its `CMT_ROLES_FILE` points at. It holds the Funktion and Roll labels, not the role segments, so the service's slug and PL rules run on it – and one row with no member number, which the service skips.
- `seed/participants/forms.ts` is the service's form template, question for question. `src/project/participants-list.ts` walks it rather than the answers, so an answer the template does not carry never reaches the wire, exactly as it never leaves the real service.
- `max-lines` is off for `seed/**` in `eslint.config.ts`. A list of participants is long because every row carries a whole registration form, and splitting it by line count would scatter it for nothing.

## The control surface

`/__mock__` is namespaced so it can never collide with a real path, and it is for tests and for putting the stack back to a known state:

- `POST /__mock__/reset` forgets every ScoutID session, code, and token. A browser's cookies survive it, but its next refresh fails and ends the session.
- `GET /__mock__/state` reports the live ScoutID sessions by email and the roles each one's next token carries, never tokens.

Keep it to that. A control surface that grows features becomes a second API to maintain.

## Before handing work back

Tests live beside the sources as `*.test.ts` and run in the `mock` Vitest project ([ADR 022](../../docs/decisions/022-test-typescript-with-vitest.md)): the auth contract and the round trip in `src/auth/routes.test.ts`, every gate on the list of participants in `src/project/participants.test.ts`, the decoded record in `participants-list.test.ts`, role minting in `roles.test.ts`, the ScoutID stand-in in `src/scoutid/provider.test.ts`, and the shared wire habits in `fastapi.test.ts` and `jwt.test.ts`. They drive the routes through `createApp()` with a shared key, a clock moved by hand, and the cookie-keeping browser in `src/testing/`, so nothing binds a port.

A stand-in that quietly drifts from the contract is worse than no stand-in, which is why the mock is one of the three packages the coverage ratchet measures at all – all of `src/` except `main.ts`, which starts a server and has no behavior of its own to assert. The tests pin the exact bytes the services send, so a service change that the mock has not followed shows up as the service disagreeing with a test, not as a test that still passes.

The authentication module consumes the mock today: its session client meets `/api/auth`, its unit read meets `/api/project`, and the Playwright walks drive the whole stack through it – so a change to a route's shape here is already a change in two places. When the participants module's DTO converters arrive they join the same contract.

Run `pnpm test` and the four checks – `check:format`, `check:lint`, `check:markdown`, `check:types` – as separate commands before handing work back.
