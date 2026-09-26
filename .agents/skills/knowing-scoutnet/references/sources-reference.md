# Sources Reference

The repositories behind this skill, when they were last checked, and how to update it.

## Last checked

25 September 2026, for version 1.0.

## Sources

| Repository                                                                                     | Visibility | Covers                                                                     |
| ---------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| `Scouterna/scoutnet-api`                                                                       | Public     | Scoutnet's OpenAPI schema and a TypeScript client                          |
| `Scouterna/skojjt-v2`                                                                          | Public     | A prose copy of Scoutnet's developer documentation, and a real client      |
| `Scouterna/Scoutnet-stuff`, `ScoutOrg`, the WordPress plugins, the Office 365 and Google syncs | Public     | How other Scouterna tools read Scoutnet                                    |
| `Scouterna/j26-scoutnet-cache`, `j26-auth`, `j26-scoutid-sync`                                 | Public     | How Jamboree 2026 used Scoutnet and ScoutID                                |
| `Scouterna/scoutid-keycloak` and its `-provider`, `-theme`, `-helm`, and `-admin` siblings     | Public     | ScoutID                                                                    |
| `Scouterna/simplesamlphp-module-scoutnetmodule`                                                | Public     | The older SAML login                                                       |
| `Scouterna/discord-scoutid-linked-role`                                                        | Public     | A client of both                                                           |
| `Scouterna/wsj27-project-api`                                                                  | Public     | The WSJ27 forms, their quirks, and the decoder                             |
| `Scouterna/wsj27-scoutview`                                                                    | Private    | An earlier WSJ tool reading the same kind of data – general mechanism only |

No official Scoutnet API documentation was publicly reachable when last checked, so the OpenAPI schema and the prose copy in `skojjt-v2` stand in for it.

This skill is published. Describe a private repository's mechanism only, and never copy a real member's data, a real answer, or a real group, troop, or patrol name – not even from an example fixture.

## Updating the skill

1. Pull the repositories above and read what changed – the OpenAPI schema, the ScoutID scopes and claims, and `wsj27-project-api`'s `docs/` first.
2. Update the reference files.
3. Bump `metadata.version` in `SKILL.md` – minor for a refresh, major for a restructuring.
