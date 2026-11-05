# Sources Reference

The repositories behind this skill, the state of things when it was last checked, and how to update it.

## Last checked

2 November 2026, for version 1.4 – `wsj27-project-api` at `v1.4.0`, which is `main` af65bf6, for the patrol route and the state below. 22 October 2026 for the cases service otherwise. The rest stands as checked on 1 October 2026.

## Sources

| Repository                              | Visibility | Covers                                                             |
| --------------------------------------- | ---------- | ------------------------------------------------------------------ |
| `Scouterna/wsj27-auth-api`              | Public     | The auth service                                                   |
| `Scouterna/wsj27-project-api`           | Public     | The participants service and the cases service                     |
| `Scouterna/wsj27-cms`                   | Public     | The CMS and its Kubernetes manifests                               |
| `Scouterna/azure-webservices`           | Public     | The shared cluster                                                 |
| `Scouterna/discord-scoutid-linked-role` | Public     | Discord linked roles through ScoutID                               |
| `Scouterna/wsj27-infra`                 | Private    | Discord and Azure storage as Terraform – described in general only |
| `Scouterna/wsj27-discord-bot`           | Private    | The Discord bot – described in general only                        |

Describe a private repository's mechanism only – never its code, names, or internal addresses. This skill is published.

## State when last checked

These describe a moment, and are the first facts to re-check:

- **The refresh interval** was hourly while registration data still churned, meant to fall to daily.
- **`dev` and `main` carry the same code.** `dev` is `main` plus one commit to `CLAUDE.md`, so what used to separate them – the `wsj27:legacy-access:` grant, hand-assigned `wsj27:access:` roles and the role route, the management team's own answers withheld from everyone, and the case access rules – is on both.

## Updating the skill

1. Pull the repositories above and read what changed – routes, cookies, roles, and access rules first.
2. Update the reference files, and the state above.
3. Bump `metadata.version` in `SKILL.md` – minor for a refresh, major for a restructuring.
