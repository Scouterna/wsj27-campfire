---
name: knowing-scoutnet
description: Provides reference facts on Scoutnet, Scouterna's membership system, and ScoutID, the single sign-on built on it. Covers Scoutnet's organization tree (kår, distrikt, avdelning, patrull), members and their roles, projects and their registration forms, the per-endpoint API keys and the quirks every integration works around, ScoutID's Keycloak realms, OIDC sign-in, scopes and claims, and how the WSJ27 project's registration forms are shaped, stored, and decoded. Use when integrating with Scoutnet or ScoutID, reading a registration answer, explaining a member number, a claim, or an access level, or when a question involves how a Scouterna service knows who someone is.
metadata:
  version: "1.0"
---

# Knowing Scoutnet

Scoutnet is where Scouterna keeps its members, groups, and events, and ScoutID is the sign-in built on it. The WSJ27 project reads its participants and their registration answers from Scoutnet, and signs people in through ScoutID. This skill covers how both work, at the level someone integrating with them needs.

## When to Use

- Reading data from Scoutnet – members, groups, a project's participants, or registration answers
- Signing someone in through ScoutID, or reading what its token carries
- Decoding a WSJ27 registration answer, or explaining why one looks empty, odd, or missing
- Explaining a member number, a Scoutnet role, an access level, or who may see health answers

## Key Context

- **The member number (`member_no`) is the key for a person everywhere** – in Scoutnet, in ScoutID's `preferred_username` as `scoutnet|<member number>`, and in every WSJ27 service.
- **Scoutnet's API keys are per endpoint and per body.** A group's member-list key does not open its waiting list, and a project has keys of its own.
- **Scoutnet answers slowly and returns everything at once**, so every integration caches it.
- **ScoutID is Keycloak.** Clients use the OIDC authorization code flow with PKCE against a realm – `scoutnet` for Scouterna's services, `wsj27` for this project.
- **ScoutID knows identity, not project roles.** A project adds its roles in a layer of its own.
- **Registration answers are encoded by how they were given, not by the question's type**, and blank, untouched, and never-asked each look different.
- **The WSJ27 forms hold special-category personal data** – health, allergies, and more – which is why every consumer gates them behind an access level.

## Reference Files

- [scoutnet-reference.md](references/scoutnet-reference.md) – Scoutnet's organization tree, members, projects, authentication, endpoints, integration patterns, and quirks.
- [scoutid-reference.md](references/scoutid-reference.md) – How ScoutID is built, how members and clients sign in, the scopes and claims, sessions, and the older SAML login.
- [wsj27-forms-reference.md](references/wsj27-forms-reference.md) – The WSJ27 registration forms, how their answers are stored, the decoding template, and the access levels.
- [sources-reference.md](references/sources-reference.md) – The repositories behind each fact, when they were last checked, and how to update the skill.

## Related Skills

- `knowing-wsj27-services` – the WSJ27 services that sign people in through ScoutID and read Scoutnet
- `knowing-wsj27` – the jamboree and the contingent the registration describes
