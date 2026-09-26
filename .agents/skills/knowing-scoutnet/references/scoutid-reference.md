# ScoutID Reference

ScoutID is Scouterna's single sign-on. A member signs in with their Scoutnet credentials, and any Scouterna service can use that sign-in without handling authentication itself. It is Keycloak with a custom authenticator that checks credentials against Scoutnet, built from the public `scoutid-keycloak` repositories.

## Contents

- [How it is built](#how-it-is-built)
- [How a member signs in](#how-a-member-signs-in)
- [Signing a client in](#signing-a-client-in)
- [What a token carries](#what-a-token-carries)
- [Sessions](#sessions)
- [The older SAML login](#the-older-saml-login)
- [How Scouterna services use it](#how-scouterna-services-use-it)

## How it is built

- **Keycloak**, in an optimized image with three additions built in: the Scoutnet authenticator (`scoutid-keycloak-provider`), the ScoutID login theme (`scoutid-keycloak-theme`), and a library for signing in to Postgres through Azure.
- **Deployed with a Helm chart** (`scoutid-keycloak-helm`) on Scouterna's shared Kubernetes cluster in Azure. Production answers at `id.scouterna.se`.
- **Realms** – `scoutnet` is the general realm for Scouterna's services. WSJ27 has its own realm, `wsj27`, which the auth service signs in against. `master` is left to Keycloak's administrators.
- **Clients** are registered through a small admin app (`scoutid-keycloak-admin`) rather than the Keycloak console.

## How a member signs in

The authenticator replaces Keycloak's own password check:

1. The member types a personal identity number or an email and a password. A personal identity number is normalized to twelve digits.
2. The authenticator checks them against Scoutnet's member sign-in API, then reads the member's profile and roles from Scoutnet.
3. The Keycloak user is always `scoutnet|<member number>`, created on first sign-in.
4. The profile – names, email, birth date, locale, picture, phone, primary group, and memberships – is copied onto the Keycloak user, and Scoutnet group memberships become Keycloak groups. A hash of the profile skips the whole resync when nothing changed.
5. With "remember me", ScoutID keeps a persistent Scoutnet token, encrypted in Keycloak's credential store, so a later sign-in by cookie can refresh the profile from Scoutnet without the password.

## Signing a client in

A client uses the OIDC authorization code flow with PKCE, like any Keycloak client:

```text
{issuer}/protocol/openid-connect/auth
{issuer}/protocol/openid-connect/token
{issuer}/protocol/openid-connect/userinfo
{issuer}/.well-known/openid-configuration
```

The issuer is `https://<host>/realms/<realm>`. A server-side client is confidential, with a client secret; a browser-only client is public and uses PKCE alone.

| Scope                  | Adds                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `openid`               | `sub`, and `preferred_username` as `scoutnet\|<member number>`                       |
| `profile`              | the names, `picture`, `birthdate`, `locale`, and `scoutnet_member_no`                |
| `email`                | `email`, `email_verified`, `scouterna_email`, and `alt_email`                        |
| `phone`                | `phone_number`                                                                       |
| `scoutnet-memberships` | the primary group's name and number, `memberships`, and `group_emails_json` – opt-in |

`scoutnet-memberships` is opt-in because a member's position in the organization is personal data beyond identity, and it roughly doubles the token.

## What a token carries

- **Identity claims** come straight from the Scoutnet profile.
- **`memberships`** groups the member's roles by body – groups, troops, patrols, and the levels above – each role with an id and a key, and a display name at group level. It is assembled from the profile and the role list; when it would exceed Keycloak's attribute size, it falls back to groups only.
- **`group_emails_json`** is derived, not fetched – a first.last address on each group's configured domain.
- **Keycloak's own claims** – `sub`, `iss`, `aud`, `exp`, `realm_access`, `resource_access` – are untouched. `sub` is Keycloak's own id, so key on `scoutnet_member_no`, not `sub`.

ScoutID carries no project roles. A project that needs roles of its own adds them in a layer on top, as the WSJ27 auth service does.

## Sessions

- A single sign-on session lasts up to 30 days.
- Access tokens are short-lived, five minutes by default, and configurable per client.
- A session signed in by cookie refreshes the profile from Scoutnet at most once an hour, so a change in Scoutnet reaches a live session within that interval rather than at once.
- To end the ScoutID session and not just its own, a client redirects through `end_session_endpoint` with `id_token_hint`.

## The older SAML login

Before Keycloak, ScoutID ran on SimpleSAMLphp at `scoutid.se`, checking credentials against the same Scoutnet endpoints and exposing groups and roles as SAML attributes. It later gained an OIDC endpoint, which some integrations still use. New integrations use the Keycloak realms, and the admin app can map an old SAML client onto a Keycloak one.

## How Scouterna services use it

- **The WSJ27 auth service** signs people in against the `wsj27` realm, never hands ScoutID's tokens to the browser, and mints its own token with WSJ27's roles – see the `knowing-wsj27-services` skill.
- **Jamboree 2026** ran a similar thin back-end for front-ends, with httpOnly cookies and a refresh script, and a scheduled job that wrote Keycloak groups from Scoutnet registration data through Keycloak's admin API.
- **The Discord linked-role bot** signs a member in to read their member number, then reads their registration from Scoutnet directly.
