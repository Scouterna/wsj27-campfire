# Cases Service Reference

The cases service – the part of the WSJ27 project's back-end, `wsj27-project-api`, that keeps follow-ups. It shares that back-end's deployment, its `/api/project` prefix, and the participants service's authentication, in `participants-service-reference.md`. It is mounted only when `POSTGRES_DSN` names its database, and without one the whole `/cases` prefix answers 404. Campfire does not use it.

A case follows up something about a person or a unit – health, safeguarding, security, logistics, or anything else – through a thread of notes. It lives in a Postgres database of its own.

- **A case** has a title, a type, a unit, and optionally the member it is about. It has an assignee, tags, and a list of members given extra access, and it is either open or closed.
- **A note** belongs to one case and has a title, text, tags, and its own extra-access list. A case must be open to take a note.
- **Secrecy** runs from 1 to 5 on both, and a note's must be at least its case's.
- **Every read of a case's notes is logged**, with who read them and when.

| Route                                                      | What it does                                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `POST /cases`, `GET /cases`                                | Creates a case; lists open cases, newest first, filtered by person, unit, type, tag, or age, closed ones on request |
| `POST /cases/{id}/close`, `POST /cases/{id}/reopen`        | Closes or reopens one. 409 when it already is.                                                                      |
| `POST /cases/{id}/notes`, `GET /cases/{id}/notes`          | Adds a note, or reads them all, newest first                                                                        |
| `PUT /cases/{id}/assignee`, `.../tags`, `.../extra_access` | Replaces the assignee, the tags, or the extra-access list; notes take the last two too                              |
| `GET /cases/types`, `GET /cases/tags`                      | The case types, and every tag in use                                                                                |

A case's type, secrecy level, and extra-access list govern who may see it. Read the code for the exact rules.
