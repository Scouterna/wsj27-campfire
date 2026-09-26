# ScoutID

ScoutID is Scouterna's single sign-on, owned and run by Scouterna – the account a Swedish scout already has, and the one they use for Campfire. It is a Keycloak installation, and it checks every sign-in against [Scoutnet](./scoutnet).

## What Campfire uses it for

- **Knowing who someone is.** The [auth service](./auth-service) runs the sign-in round trip with ScoutID and gets back the person's Scoutnet member number, the same key the list of participants uses.
- **Signing out everywhere.** Signing out of Campfire ends the ScoutID session too.

Campfire never sees a password or a ScoutID token. The password is typed on ScoutID's own pages, and the session Campfire holds is the auth service's, in cookies on Campfire's own origin ([ADR 019](/decisions/019-authenticate-on-the-app-origin-through-scoutid)). Everyone Campfire is for already has a ScoutID account, so nobody needs a second one.

ScoutID says who someone is, not what they do in the contingent. It knows nothing about WSJ27, so the roles come from the [participants service](./participants-service), and the auth service adds them to the session on top of ScoutID's identity.

In the shells, the round trip opens in a modal webview that may visit only Campfire's sign-in path and the identity provider's own pages.

## Locally

In the [local environment](../../development/environments), nothing reaches ScoutID. The [mock](../../testing/mock) holds a stand-in whose sign-in page is a persona picker – tap a name, no password, and the session carries the roles that person would have ([ADR 021](/decisions/021-develop-against-a-mock-back-end)).
