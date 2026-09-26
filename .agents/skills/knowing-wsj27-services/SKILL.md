---
name: knowing-wsj27-services
description: Provides reference facts on the WSJ27 project's back-end services and the platform they run on – wsj27-auth-api (sign-in through ScoutID and the project's own signed tokens), the participants service (the list of participants from Scoutnet, WSJ27 roles, and who may read what) and the cases service (follow-ups about a person or a unit), both part of wsj27-project-api, the wsj27-cms handbook, and the contingent's Discord. Covers routes, cookies and tokens, role strings such as wsj27:al:<unit> and wsj27:cmt:<function>:<role>, the 404-versus-403 access rules, the /api/auth and /api/project paths on one origin, and the Kubernetes cluster in Azure. Use when calling, debugging, or writing about these services, or when a question involves WSJ27 roles, access levels, or sign-in.
metadata:
  version: "1.0"
---

# Knowing WSJ27 Services

The back-end the WSJ27 project runs beside Campfire, at the level a client developer needs. The services are Python, one repository each, deployed on Scouterna's shared Kubernetes cluster in Azure. Campfire reaches them on its own origin.

## When to Use

- Calling the auth, participants, or cases service
- Answering what a WSJ27 role string means, or why a caller got 404 rather than 403
- Debugging sign-in, a session that ends, or a caller treated as signed out
- Working with cases – the follow-ups the health, safety, and management teams keep about a person or a unit
- Writing about the CMS handbook, the contingent's Discord, or where the services run

## Key Context

- **Three services.** `wsj27-auth-api` signs people in through ScoutID and issues its own RS256 tokens. The WSJ27 project's back-end, `wsj27-project-api`, runs the other two. The participants service holds the list of participants read from Scoutnet, mints every WSJ27 role, and decides who may read what. The cases service keeps follow-ups about a person or a unit, written as notes by the health, safety, and management teams, only where its database is configured.
- **One direction of trust.** The auth service asks the participants service for the role map; nothing calls the other way.
- **One origin.** Behind the ingress, `/api/auth` reaches the auth service and `/api/project` the project's back-end – the participants service, and the cases service under `/api/project/cases` – each with the prefix stripped. The CMS lives under `/_services/cms`.
- **Trust only the auth service's token**, discovered from its own `/.well-known/openid-configuration`, never ScoutID's tokens directly. A user token and a service-account token have the same shape.
- **Roles are minted, never assigned.** `wsj27:al:<unit>` for a unit leader, `wsj27:cmt:<function>:<role>` for the contingent management team, and `wsj27:access:<level>` for a personal access grant. Deltagare and IST get no role.
- **Match roles segment by segment.** `wsj27:cmt:admin:it` satisfies `wsj27:cmt`; `wsj27:cmtx` does not, although `startsWith` would say it does.
- **404 means you may not know it exists; 403 means you may know, but not see this much.** No access answers exactly like a record that does not exist. Access at too low a level is 403, never a quietly reduced 200.
- **The access token lives five minutes.** The refresh window lasts as long as ScoutID's session, and the page refreshes shortly before expiry. Roles are recomputed on every refresh.

## Reference Files

- [auth-service-reference.md](references/auth-service-reference.md) – `wsj27-auth-api`: its routes, cookies, token claims, refresh script, service accounts, and configuration.
- [participants-service-reference.md](references/participants-service-reference.md) – The participants service: its routes, the role model, the access rules, and how it reads Scoutnet.
- [cases-service-reference.md](references/cases-service-reference.md) – The cases service: cases, notes, secrecy, and its routes.
- [platform-reference.md](references/platform-reference.md) – Where the services run, how they deploy, the CMS, and Discord.
- [sources-reference.md](references/sources-reference.md) – The repositories behind each fact, the state of things when last checked, and how to update the skill.

## Related Skills

- `knowing-scoutnet` – ScoutID and Scoutnet, which the services build on, and how the WSJ27 registration forms are structured
- `knowing-wsj27` – the jamboree and the contingent the roles describe

## Important Notes

- Both services are pre-1.0 and change often. Check [sources-reference.md](references/sources-reference.md) for when facts were last checked, and read the repositories for anything load-bearing.
- The repository READMEs can lag behind where things are deployed. An older host and path appear in them; Campfire's own `/api/auth` on one origin is current.
