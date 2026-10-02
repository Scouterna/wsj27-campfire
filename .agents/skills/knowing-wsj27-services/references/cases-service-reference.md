# Cases Service Reference

The cases service – the part of the WSJ27 project's back-end, `wsj27-project-api`, that keeps follow-ups. It shares that back-end's deployment, its `/api/project` prefix, and the participants service's authentication, in `participants-service-reference.md`. It is mounted only when `POSTGRES_DSN` names its database, and without one the whole `/cases` prefix answers 404. Campfire's cases section uses it for the health team's cases about a person.

A case follows up something about a person or a unit through a thread of notes. It lives in a Postgres database of its own, whose tables the service creates as it starts.

- **A case** has a title, a type, a unit, and optionally the member it is about – left out, it is about the unit as a whole. It has an assignee, tags, and a list of members given extra access, and it is either open or closed. Closing records who closed it and when; reopening clears both, so nothing records that a case was ever closed.
- **A note** belongs to one case and has a title, text, tags, and its own extra-access list. A case must be open to take a note. A note cannot be edited or deleted.
- **A case's title** cannot be changed after it is created, because no route writes it.
- **Every read of a case's notes is logged**, one row per read, with who read them and when. Nothing else is logged – the list of cases included.

| Route                                                      | What it does                                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `POST /cases`, `GET /cases`                                | Creates a case; lists open cases, newest first, filtered by person, unit, type, tag, or age, closed ones on request |
| `POST /cases/{id}/close`, `POST /cases/{id}/reopen`        | Closes or reopens one. 409 when it already is.                                                                      |
| `POST /cases/{id}/notes`, `GET /cases/{id}/notes`          | Adds a note, or reads them all, newest first                                                                        |
| `PUT /cases/{id}/assignee`, `.../tags`, `.../extra_access` | Replaces the assignee, the tags, or the extra-access list; notes take the last two too                              |
| `GET /cases/types`, `GET /cases/tags`                      | The case types, and every tag in use                                                                                |

There is no route for one case – a client finds it in the list, asking for the closed ones too.

## Types, secrecy, and access

Each of these is stored for an access model still to be built, and none of them decides who may read or write a case yet.

- **Type** – one of `hälsa`, `admin`, or `avdelning`, and anything else is refused with 422. The type is meant to set a case's default access level; today it only narrows what a case may be created as, and filters the list.
- **Secrecy level** – 1, the least secret, to 5, on both a case and a note. The one rule is that a note's level may not be lower than its case's, refused with 422.
- **Extra access** – a list of member numbers on both a case and a note, replaced whole rather than merged. Nothing reads it.

**What is enforced** is only the participants service's authentication: a caller with no token, or with no role under `wsj27:`, is refused. Anyone past that – every unit leader, every member of the management team, and anyone holding a personal grant – may list, read, write, close, and reopen every case. Deltagare and IST hold no role, so they are refused.
