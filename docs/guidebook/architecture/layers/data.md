# Data layer

The data layer is where the outside world is dealt with – the back-end services, the shapes they send, and the cache that keeps their answers – and turned into the types [the domain](./domain) declares.

Only a module that owns a capability has one. Authentication asks the auth service who is signed in, and reads the signed-in person's own registration – their unit and how they travel – from the participants service. Participants reads the list of participants. No other module talks to a service.

## Query factories

Every data read is a factory returning TanStack Query options – a stable key, and the function that would make the request ([ADR 017](/decisions/017-route-and-load-data-with-tanstack-router-and-query)). It describes the request rather than making it, so a screen that reads, a prefetch, and a test that substitutes share one definition, and however many callers there are it is one request and one cache entry. The one read outside this pattern is the question of who is signed in, which the session asks itself ([ADR 033](/decisions/033-recover-an-ended-session-at-the-query-client-and-the-gate)).

The factories live in `data/` and are the only thing in a module that knows a URL. A screen calls a hook, the hook reads the options, and the options know the address – so the factory knows the address and the hook, which lives in `ui/`, knows React. Every URL is origin-relative, and the mock and the real services answer the same paths, so the application never learns which environment it runs in ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)).

Every read goes through the application's one query client, so one cache holds every answer. The `fetch` wrapper in `libraries/utils` is only the transport inside a query function; a read that called it directly would be neither cached, deduplicated, nor owned. The wrapper keeps three outcomes apart – the request never arrived, the service refused, or the answer was not JSON – and a refusal carries its status, because the status means something. A person's full record refused with 403 means the caller may see them but not in full, so the read steps down to the basic level; a 404 means there is nobody to show.

## DTOs and converters

The services live in their own repositories and change on their own schedule, so no payload is trusted. Every field of a DTO is typed `unknown`: a DTO says which keys to expect and promises nothing about what arrived in them, because a field declared `string` would turn a bad payload into a crash far from the boundary.

A converter beside each DTO validates the payload into a domain type, or returns `undefined` when it is not one. That function is the whole boundary. A DTO never leaves `data/`, so nothing above it sees a wire field name, and a field renamed upstream stops at the converter.

Returning `undefined` rather than throwing lets the caller decide what a bad record costs. In a list, a row that does not convert is dropped and the rest is shown, because one malformed record must not empty the list a leader is trying to read. A single record that does not convert fails its query, and the screen says the person could not be shown.

## Who is asking

The participants service lists one unit or one member type at a time and refuses what the caller may not read. It has no "everyone I may see" read, so the client asks for exactly what the caller may read, and for that it has to know who is reading.

The composition root distills that once from the session – the member number, the unit a leader leads, and whether the whole contingent and the health answers are theirs – and mounts it above every screen as the viewer the factories take. A leader asks for their own unit. The contingent management team walks the leaders' listing to learn every unit, then fetches each unit, the IST, and the management, and merges them by member number.

A unit's listing that fails is asked once more, and if it still fails the whole list fails, because a partial contingent looks complete to whoever reads it. The list carries its scope – everyone, one unit, or nobody – so a screen can say what it shows rather than guess from a row count.

## An ended session

A 401 is not the module's to handle. The query client runs every read under the authentication module's session wrapper, so a module declares nothing to be covered ([ADR 033](/decisions/033-recover-an-ended-session-at-the-query-client-and-the-gate)):

- A 401 asks the auth service who is signed in, refreshing the session once if needed, and every read refused meanwhile joins that one ask.
- The same person still signed in runs the read once more. The query stays pending throughout, so the screen shows its loading state and never a failure.
- A service that says nobody is signed in ends the session at the gate, and one that names somebody else reloads the page ([Presentation layer](./presentation#the-session-gate)).
- A service that cannot be reached ends nothing, and the cache stays, because on the island a lost signal is ordinary.

The auth service's own script keeps an active session alive, and the application watches the session's expiry cookie beside it, so a session that lapses under an idle screen is noticed without waiting for a read. A 403 or a 404 stays the module's, because it is an answer about the data rather than about the session.

## Offline first

The cache is set for a camp site rather than a desk. Thousands of phones share the few cell towers that reach the island, which is exactly when a leader needs the list of participants and exactly when a request is least likely to answer ([ADR 017](/decisions/017-route-and-load-data-with-tanstack-router-and-query)).

| Setting                              | Value          | Why                                                          |
| ------------------------------------ | -------------- | ------------------------------------------------------------ |
| `gcTime`                             | 30 days        | A cold start without a connection still has the list         |
| `networkMode`                        | `offlineFirst` | A query runs even when the webview guesses it is offline     |
| `refetchOnMount`                     | `always`       | A screen draws the cache at once and asks for a fresh answer |
| `refetchOnWindowFocus`, `…Reconnect` | off            | A phone waking up is not a reason to ask                     |

A fresh answer that fails leaves the cached one in place, so a screen that has ever loaded keeps showing what it had.

The cache is persisted query by query into IndexedDB, rather than as one snapshot rewritten on every change, which stalls a phone once the list is large. A version number on the store discards what an older build wrote, so an old shape is never read as a new one.

## The cache has an owner

The cache holds personal data for up to thirty days, health answers included, so it belongs to one member number at a time ([ADR 017](/decisions/017-route-and-load-data-with-tanstack-router-and-query)). Before any screen mounts, the session gate hands it to the signed-in person, and a different person than last time wipes it in memory and on disk first. A leader's cached unit must never be shown to the next person who signs in on the same phone.

The same person signing back in keeps everything – that is the offline-first promise, and only a change of person costs a refetch. Signing out, or a session the service ends, forgets the cache before the sign-in screen shows.
