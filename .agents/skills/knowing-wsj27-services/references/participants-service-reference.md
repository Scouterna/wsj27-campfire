# Participants Service Reference

The participants service – the part of the WSJ27 project's back-end, `wsj27-project-api`, that holds the people. It reads the participants, the registration forms, and their answers from Scoutnet, decodes them into a stable shape, mints every WSJ27 role, and serves both to Campfire and to the auth service. The same back-end runs the cases service, in `cases-service-reference.md`. How the forms are structured is in the `knowing-scoutnet` skill.

## Contents

- [Routes](#routes)
- [Authentication](#authentication)
- [Roles](#roles)
- [Access](#access)
- [Scoutnet data](#scoutnet-data)
- [Configuration](#configuration)

## Routes

Served at the service's root; the ingress adds and strips `/api/project`.

| Route                                      | What it does                                                                                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /participants/troopinfo/{troop}`      | The participants in one unit, or in one member type – `al`, `ist`, or `cmt`. Takes `infolevel`.                                                                                                  |
| `GET /participants/individual/{member_no}` | One participant. Takes `infolevel`.                                                                                                                                                              |
| `GET /participants/roles`                  | The whole role map – member number to roles – for callers holding `wsj27:bulkread`, `wsj27:rolereader`, or `wsj27:cmt:admin`. Answers 304 on a matching `If-None-Match`, and 404 to anyone else. |
| `GET /scoutnet/refresh`                    | Refreshes the Scoutnet cache now. 409 while the service is pinned to a snapshot.                                                                                                                 |
| `GET /`                                    | Health.                                                                                                                                                                                          |

`/participants/roles` is left out of the API docs, but it is the contract the auth service depends on, so its path does not change.

`infolevel` is `name`, `basic`, or `full`:

- **`name`** – the name and member number. It needs basic access, so a caller with none cannot use it to learn that someone exists.
- **`basic`** – the decoded basic fields and the contact details.
- **`full`** – adds the form answers, including health.

## Authentication

Every route but health needs the auth service's access-token cookie or a bearer token, verified through discovery with 30 seconds of leeway. A caller holding no `wsj27:` role at all is refused before any route runs. Every response carries no-cache headers.

## Roles

The service is the single definition of a WSJ27 role. Roles are minted once, when Scoutnet data is decoded, and stored on the participant.

- **`wsj27:al:<unit>`** – a unit leader (Avdelningsledare), scoped to their own unit. A leader with no unit on file gets no leader role.
- **`wsj27:cmt:<function>:<role>`** – a member of the contingent management team (Kontingentledning). The function and role come from a roster file matched by member number, because Scoutnet does not hold them. Someone missing from the roster gets plain `wsj27:cmt`. A trailing "PL" on a role is dropped, so a coordinator mints the same role as the rest of their team.
- **`wsj27:access:<level>`** – a personal access grant from the registration form, added to whatever else the person holds. No grant is expressed by no role.

Segments are slugified – accents folded, anything else collapsed to a dash – so no segment can smuggle in a colon. Deltagare and IST get no role.

## Access

| Caller              | `name` and `basic`  | `full`                                                                                               |
| ------------------- | ------------------- | ---------------------------------------------------------------------------------------------------- |
| A unit leader       | Their own unit only | Their own unit only                                                                                  |
| The management team | Everyone            | Only with the health team's role, `wsj27:cmt:support:halsa`, or a personal health-and-internal grant |
| Anyone else         | Nothing             | Nothing                                                                                              |

- **No access answers 404**, with the same body as a record that does not exist, so a refusal never confirms membership. Access at too low a level answers 403.
- **A unit's own leaders are names only to each other.** A unit leader's contact details and answers go only to management with health access, so a leader reading their unit sees its young people in full and its other leaders by name.
- **The management team's own answers** are held back more tightly still, from everyone without the personal grant.
- **Access adds up.** Someone who is both a leader and on the management team gets full access to their own unit and management's access everywhere else.
- For a unit listing, access is decided before the lookup. For one person it is decided after, because their unit decides it – with the same 404 either way.
- Fields are withheld from a row rather than the whole row refused, because one listing mixes kinds of participant.

## Scoutnet data

The service fetches each configured Scoutnet project's participants, forms, and answers, decodes the answers against a hand-maintained template, and caches the result in memory and on disk. It refreshes on a schedule anchored at 03:00 Stockholm time, with backoff when Scoutnet fails, and always serves the previous cache meanwhile. With no fresh fetch and no cache on disk at start, it stops rather than serve nothing.

## Configuration

| Variable                                                 | Meaning                                                                                                                                        |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `SCOUTNET_PROJECTS`                                      | The Scoutnet projects to read, with each project's API keys                                                                                    |
| `SCOUTNET_BODYLIST_ID`, `SCOUTNET_BODYLIST_KEY`          | Reads the scout groups' names                                                                                                                  |
| `SCOUTNET_REFRESH_INTERVAL_HOURS`, `PERSIST_DIR`         | How often to refresh, and where the disk cache lives                                                                                           |
| `SCOUTNET_SNAPSHOT_DIR`                                  | Pins every read to a captured snapshot and stops refreshing                                                                                    |
| `CMT_ROLES_FILE`                                         | The management team's roster of functions and roles                                                                                            |
| `AUTH_DISABLED`, `FAKE_USER_ROLES`, `SCOUTNET_DEV_CACHE` | Local development only – no token check, a fake caller's roles, and a disk cache of raw responses that would freeze a deployment on stale data |
