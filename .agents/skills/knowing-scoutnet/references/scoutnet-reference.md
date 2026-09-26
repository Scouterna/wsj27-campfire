# Scoutnet Reference

Scoutnet is Scouterna's membership system, run by the volunteer group Scouternas E-tjänster. This reference covers its data model, its API, and the quirks every integration works around. The closest thing to an official specification is the OpenAPI schema in the public `scoutnet-api` repository, still pre-1.0.

## Contents

- [The organization tree](#the-organization-tree)
- [Members](#members)
- [Projects](#projects)
- [Authentication](#authentication)
- [Other endpoints](#other-endpoints)
- [How integrations use it](#how-integrations-use-it)
- [Quirks](#quirks)

## The organization tree

Everything is a **body** in a tree – organization, region, district, group, troop, patrol – plus networks and federated organizations that share Scoutnet. A body has a `body_key` such as `group_1234`.

| Swedish       | Scoutnet                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------- |
| scoutkår      | `group`, with a visible `group_no`                                                              |
| distrikt      | `district`                                                                                      |
| avdelning     | `troop`                                                                                         |
| patrull       | `patrol`                                                                                        |
| gren          | a troop's `type` – beaver, tracker, discoverer, adventurer, challenger, rover, family, or other |
| medlemsnummer | `member_no`, the durable key for a person everywhere                                            |

A hub group (Hub-kår) holds internal sections that other tools treat as groups of their own. Scoutnet does not expose which age branch groups a troop above the troop level, so tools that need it keep that mapping themselves.

## Members

A member carries their member number, name, personal identity number, date of birth, sex as a code, membership status, contact details and guardians' contact details, address, their group, troop, and patrol, and their roles. Roles nest by body – group, troop, patrol – each with an id, a key, and a name. Leader roles include avdelningsledare, ledare, vice avdelningsledare, and assisterande ledare.

A group's member list includes only active members by default; flags add those on the waiting list or awaiting approval.

## Projects

A project (arrangemang) is an event, activity, or course, with its own API keys independent of the group that owns it. A project has a name, start and end, and an age range.

- **`/project/get/participants`** – every participant, keyed by member number, with registration and check-in state, their membership placement from patrol up to organization, their contact details, their answers keyed by question id, and required courses such as Trygga möten.
- **`/project/get/questions`** – an index of the project's registration forms, each with its own endpoint returning the questions, their choices, and the tabs and sections that lay the form out.
- **`/project/get/groups`** – the groups with members attending.
- **`/project/checkin`** – updates check-in and attendance, and can update answers too.

How a registration form's answers are encoded is in `wsj27-forms-reference.md`.

## Authentication

Every endpoint is scoped to one body and authenticated on its own:

- **The username is the body's internal id**, which may differ from any visible number – find it in the body's own settings.
- **The password is an API key for that one endpoint on that one body.** A key for a member list does not work for waiting-list registration, or for another group. A body's admin page, under Webbkoppling, turns the API on and generates or regenerates each key.
- **Basic auth is the usual transport.** A bearer header or `id` and `key` parameters are accepted too, and TLS is required.
- **A refused request is a 401 with an empty body**, not JSON, so a client must not try to parse it.

A separate member-facing API signs a person in with username and password and returns a JWT, short-lived unless the app registers a stable id. ScoutID is built on that sign-in – see `scoutid-reference.md`. Its tokens do not work against the body-scoped API, and the body keys do not work against it.

## Other endpoints

- **Group endpoints** – the group's details and statistics, its full member list as JSON, CSV, XLS, or PDF, waiting-list registration, and bulk membership updates.
- **Custom lists (fördefinierade listor)** – member data filtered by a group's configured mailing lists. This is how sync tools build distribution lists.
- **Incremental dumps** – all groups, all published role-holders, and all published projects, filterable by `updated_since`.
- **A body-relations list** exists for Scouterna's own internal systems only.

## How integrations use it

Scoutnet can take many seconds to answer and has no pagination, so every integration caches:

- **Caches with a lifetime**, refreshed before users hit a cold one.
- **A small caching proxy**, as Jamboree 2026 ran, which reshapes the data on the way through – hub sections as groups, numeric enums as names.
- **Imports on demand**, recording when the last one ran so the user sees stale data coming.
- **Nightly batch syncs** to Office 365 and Google Workspace, which check that Scoutnet itself is current before syncing and delete what a member who left no longer needs.

Every tool pins one way of writing back – form-encoded fields or one JSON body – and never mixes them.

## Quirks

- **An empty object arrives as `[]`**, not `{}`. Every consumer special-cases it.
- **The member list wraps every field as `{value, raw_value}`.** `value` is a translated label that changes with language; use `raw_value` for anything programmatic.
- **Moving a member to another troop needs `status` in the same request**, or Scoutnet reports success and changes nothing. A patrol change needs the troop too, or the patrol is validated against the member's old troop.
- **Phone numbers come without `+`**, as bare digits starting with the country code.
- **Contact-type ids are configured per group** and cannot be listed through the API.
- **Answers are barely validated on write** – text can land in a number question.
- **Incremental dumps drop deleted records** rather than marking them, so a consumer cannot see a deletion.
