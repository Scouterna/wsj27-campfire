# Cases Service Reference

The cases service – the part of the WSJ27 project's back-end, `wsj27-project-api`, that keeps follow-ups. It shares that back-end's deployment, its `/api/project` prefix, and the participants service's authentication, in `participants-service-reference.md`. It is mounted only when `POSTGRES_DSN` names its database, and without one the whole `/cases` prefix answers 404. Campfire's cases section uses it for cases about people or a unit kept by the health team, the management team, and a unit's leaders.

A case follows up something about some people or a unit through a thread of notes. It lives in a Postgres database of its own, whose tables the service creates as it starts.

- **A case** has a title, a type, a unit, and the members it is about, `about_person_ids` – none for a case about the unit as a whole. The unit is optional too, except on a unit's case (422 `An avdelning case needs a troop`), so a case can be about neither. It has an assignee, tags, and a list of members given extra access, and it is either open or closed. Closing records who closed it and when; reopening clears both, so nothing records that a case was ever closed.
- **A note** belongs to one case and has a title, text, tags, its own secrecy level, and its pictures. A case must be open to take a note. A note cannot be edited or deleted, only given new tags and pictures.
- **A picture** belongs to one note and is read by whoever may read the note, on a closed case too. It is re-encoded on arrival as a JPEG of at most 2048 pixels either way, with a thumbnail of at most 320, which drops its EXIF, location included. The files sit on the service's disk beside a row in the database, and nothing deletes them.
- **A closed case is frozen** – only reopening it is allowed, and every other write answers 409 `Case is closed`.
- **Every read of a case's notes is logged**, one row per read, with who read them and when. Nothing else is logged – the list of cases included.

| Route                                                      | What it does                                                                                                                              |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /cases`, `GET /cases`                                | Creates a case; lists open cases, newest first, filtered by person – anyone on the case – unit, type, tag, or age, closed ones on request |
| `POST /cases/{id}/close`, `POST /cases/{id}/reopen`        | Closes or reopens one. 409 when it already is.                                                                                            |
| `POST /cases/{id}/notes`, `GET /cases/{id}/notes`          | Adds a note, or reads the ones the caller may, newest first                                                                               |
| `GET /cases/{id}/access`                                   | The member numbers of the participants who can open the case – the choices for its assignee                                               |
| `PUT /cases/{id}/about_person_ids`                         | Replaces who an open case is about, by the type's role holders alone (403) – see below                                                    |
| `PUT /cases/{id}/title`                                    | Renames an open case; an empty title is refused with 422                                                                                  |
| `PUT /cases/{id}/assignee`, `.../tags`, `.../extra_access` | Replaces the assignee (one of the access list), the tags, or the extra-access list; a note takes new tags too                             |
| `POST /cases/{id}/notes/{note}/attachments`                | Attaches one picture as a multipart upload in the field `file` – see below                                                                |
| `GET /cases/{id}/notes/{note}/attachments/{picture}`       | The picture as `image/jpeg`, or its thumbnail with `?thumbnail=true`. 404 for a note the caller may not read                              |
| `GET /cases/types`, `GET /cases/tags`                      | The types the caller may open cases of, and the tags on what the caller may read                                                          |

There is no route for one case – a client finds it in the list, asking for the closed ones too. Every note in a list or a write's answer carries `attachments`, its pictures oldest first, each with its id, size in pixels and bytes, and the file name it was uploaded under.

Changing who a case is about writes a note at the case's level, titled `Changed who the case is about`, with a line `Added: <ids>` and a line `Removed: <ids>` of comma-separated member numbers, either left out when empty. The same list again changes nothing and writes no note.

A picture is attached by the note's author alone (403 `Only the note's author may attach to it`), on an open case, at any time after the note was written. A note takes at most ten (409), each at most 20 MB (413), and only a JPEG, PNG, or WebP (422). The picture route sets a year's `Cache-Control`, but the service's middleware replaces it on every response with `no-store`, so a browser fetches a picture again on every view.

## Types, secrecy, and access

Three things decide who reaches a case. Roles are compared segment by segment, never as a string prefix.

- **Type** – each needs a role: `hälsa` needs `wsj27:cmt:support:halsa`, `cmt` needs `wsj27:cmt`, and `avdelning` needs `wsj27:al:<unit>` for the case's own unit, its `troop`. The management team and the health team do not reach unit cases, and a bare `wsj27:al` gives no type. A personal health grant gives no type either. A caller whose roles give no type at all is refused every `/cases` route with 403 `No access to cases`. Anything but the three types is refused with 422.
- **Secrecy level** – fixed when the case is created, 3 by default. At 3, the type's role holders and the people on its extra-access list reach it. At 4, only the role holders, and the list must stay empty (422). At 5, only its creator, while they still hold the role, and the people on the list. Levels 1 and 2 are reserved and refused with 422.
- **Extra access** – a list of member numbers on the case alone, replaced whole rather than merged. Someone on it may do what a role holder may, except change the list or write a level 4 note (403 `Only the case type's own roles may do this`). Being on it gives no type, so it only helps someone who already holds one.
- **A note's level** defaults to its case's and may not be lower (422). Above the case's level, 4 hides the note from everyone on the extra-access list, and 5 from everyone but its author.

A case the caller does not reach answers 404 `Case not found`, exactly like one that does not exist, and is left out of every list. That check comes before the 409 for a closed case. Creating a unit's case about someone outside the unit, or adding them to one, answers 422 `Member <id> is not in troop <unit>`, the same as for someone who does not exist. Deltagare and IST hold no role, so they are refused.
