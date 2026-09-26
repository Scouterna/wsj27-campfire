# Auth service

The auth service, `wsj27-auth-api`, is the WSJ27 project's own sign-in service. It turns a round trip to [ScoutID](./scoutid) into a session on Campfire's origin, and does nothing else. It lives in a repository of its own and is released on its own ([ADR 013](/decisions/013-keep-the-back-end-services-in-their-own-repositories)), which is why it is a system beside Campfire rather than a part of it. Campfire reaches it under `/api/auth` on its one origin, so the front-end asks for it with no host and no environment switch ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)).

## What Campfire uses it for

- **Signing in.** Signing in is a full-page navigation to the service, which takes the browser through ScoutID and back and sets the session as httpOnly cookies on Campfire's origin. The application never holds a token, so no script can read one or leak it ([ADR 019](/decisions/019-authenticate-on-the-app-origin-through-scoutid)).
- **Saying who is signed in.** The service answers with the person's name, Scoutnet member number, and WSJ27 roles. The roles come from the [participants service](./participants-service), which reads them from the list of participants.
- **Keeping the session alive.** The access token is short-lived. A small script the service serves refreshes it while the app is open, so an active user is not sent back to sign-in mid-task.
- **Signing out.** Signing out ends the ScoutID session too, because otherwise the next sign-in would silently reuse it.

The authentication module is the only part of Campfire that talks to the service. The shells do not call it themselves – they open the same round trip in a modal webview that shares their cookie jar, and the main webview takes over once it lands back signed in.

## Locally

In the [local environment](../../development/environments), the [mock](../../testing/mock) answers in its place and signs real tokens, with a stand-in for ScoutID whose sign-in page is a persona picker ([ADR 021](/decisions/021-develop-against-a-mock-back-end)).
