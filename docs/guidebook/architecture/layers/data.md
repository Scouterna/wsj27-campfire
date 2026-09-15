# Data layer

Where the outside world is dealt with – the participants service, the wire shapes, the cache – and turned into the types [the domain](./domain) declares.

Only the module that owns a capability has a data layer, and only two modules have one at all: authentication, which asks the auth service who is signed in and reads the signed-in person's own unit from the participants service, and participants, which reads the register. No other module talks to a service, and the C4 model draws exactly those three edges.

## Query factories

Every fetch is declared as a factory that returns TanStack Query options – a stable key array, and the function that would make the request. It describes the request rather than making it, which is what lets one definition serve a route that prefetches, a component that reads, and a test that substitutes, collapsed into a single request and a single cache entry however many callers there are.

The factories live in `data/`, one per endpoint, and they are the only thing in a module that knows a URL. A screen calls a hook; the hook reads the options; the options know the address. The hook itself is presentation and lives in `ui/` – the factory knows the URL, the hook knows React.

Every read goes through the application's one query client. The composition root owns it and hands it to whatever asks – a screen's hook through the provider, or a plain function the way the session gate hands it to `currentUser` – so one cache holds every answer. The `fetch` wrapper in `libraries/utils` is only ever the transport inside a query function; a read that calls it directly answers without being cached, deduplicated, or owned, which is why it is wrong even when it works.

Keys are arrays and they are stable, because the cache is addressed by them – `["participants", "list"]` is the register, and it stays that whoever is reading, since a session has one viewer and the cache changes owner with the sign-in.

## DTOs and the boundary they guard

The participants service is a separate service in its own repository that can change shape over an eighteen-month build, so nothing trusts its payloads.

**Every field on every DTO is typed `unknown`.** A DTO says which keys to expect; it promises nothing about what arrived in them. Declaring a field `string` would be a promise the module cannot keep, and would turn a bad payload into a crash somewhere far from the boundary.

A converter beside it validates the payload into the domain type, and that function is the whole boundary:

```ts
/**
 * One row as the domain knows it, or undefined when the payload is not one.
 */
export function toParticipant(dto: ParticipantDto): Participant | undefined {
  // …
}
```

`undefined` rather than a throw, because **a bad row in a list is dropped and the rest is shown**. One malformed record must not empty the register a leader is standing in a field trying to read. A detail fetch is the opposite case: there is one record, so a payload that does not convert is a screen that says the person could not be loaded.

A DTO never leaves the layer. Nothing above `data/` sees a wire field name, which is why a field that gets renamed upstream stops at the converter.

## Calling a service

Every URL is origin-relative – `/api/project/participants/troopinfo/3`, never an absolute address – so the application never learns which environment it is running in ([ADR 012](/decisions/012-run-campfire-in-three-environments-on-one-origin)). The ingress decides who answers, and locally that is the mock.

The fetch itself lives in `libraries/utils`, wrapped so that three outcomes are distinguishable: the request never reached anything, the service answered with a refusal, and the answer was not JSON at all. A refusal carries its status, and the status is load-bearing – the detail fetch asks for the full information level, and a caller who may see the person but not their health answers is refused rather than quietly given less, so the client retries the same person at the basic level. Telling a refusal from a missing person is the difference between a second request and a wrong screen.

## Who is asking

The participants service lists the register one troop at a time and gates every answer by the caller's roles. There is no "everyone I may see" endpoint, so the client composes the register from exactly the listings the service would allow, and to do that it has to know who is reading.

That fact is distilled once, in the composition root, out of the signed-in session: the member number, the unit a leader leads, whether the whole register is theirs to read, and whether the health answers are – each read from the session's roles with the role helpers. It is mounted above every screen, and the query factories take it. A leader asks for their own troop; the contingent management walks the leaders' listing to learn every troop, then fetches each troop, the IST, and the management itself and merges them by member number.

The scope travels with the answer, so the register carries what it is – everyone, one unit, or nobody – and a screen can say so rather than guess from a row count.

## Offline by default

The cache is configured for a field in Poland rather than for a desk, and the settings are recorded rather than left to the library ([ADR 017](/decisions/017-route-and-load-data-with-tanstack-router-and-query)). Campfire's worst day is a Tuesday on Wyspa Sobieszewska with two and a half thousand Swedish scouts sharing whatever cell towers Gdansk points at the island, which is exactly when a leader needs the register and exactly when a request is least likely to answer.

| Setting                                          | Value          | Why                                                                                                          |
| ------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------ |
| `staleTime`                                      | 24 hours       | Data that arrived once stays until something better does                                                     |
| `gcTime`                                         | 30 days        | A cold start with no connection still has the register                                                       |
| `networkMode`                                    | `offlineFirst` | A query runs against the cache before it asks the network                                                    |
| `refetchOnMount`, `OnWindowFocus`, `OnReconnect` | off            | Refetching is something the application asks for, not something a phone waking up in a field does on its own |

Persistence is per query, into IndexedDB, rather than one serialized snapshot of the whole cache – writing the entire cache on every change freezes the UI on a phone once the register is large. The store carries a schema buster, so a shape change invalidates what is on disk instead of decoding into the wrong type.

The cost is stated in the decision and worth repeating: stale is the normal case, and a correction made in the register can take a day to appear on a phone unless something asks for it. The first screen where day-old data would mislead somebody is the one that has to offer a refresh.

## The cache has an owner

Personal data sits on the device for up to thirty days, health answers included, so the cache is owned by the person it was fetched for ([ADR 017](/decisions/017-route-and-load-data-with-tanstack-router-and-query)). The session gate adopts the signed-in member number before any screen mounts; a different owner than the stored one wipes both the in-memory client and the store first.

A leader's cached unit must not survive to the next person who signs in on the same phone. The same person signing back in keeps everything, which is the offline-first promise – only a change of person costs a refetch.
