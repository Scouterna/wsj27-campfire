import {
  experimental_createQueryPersister as createQueryPersister,
  type AsyncStorage,
} from "@tanstack/query-persist-client-core"
import { QueryClient } from "@tanstack/react-query"
import { clear, createStore, del, get, set } from "idb-keyval"

/**
 * The application's one query client, and the store that keeps its answers across a cold
 * start.
 *
 * The defaults are ADR 017's, set for a field in Poland rather than for a desk: answers
 * stay fresh for a day, survive for thirty, and a query fires even when the browser
 * believes it is offline, because a webview's guess about a camp site's connectivity is
 * not to be trusted. Nothing refetches on mount, focus, or reconnect – the data this
 * application reads changes on a human timescale.
 *
 * Every service read goes through this client – the gate hands it to `currentUser`, the
 * screens' hooks read it from the provider the gate mounts – so one cache holds every
 * answer, and one IndexedDB store persists it query by query. The store's buster is the
 * cached shapes' version: bump it whenever a persisted payload's shape changes, because
 * a stale shape read as a fresh one is worse than a cold cache. And the cache belongs to
 * one member number at a time – `adoptCacheOwner` wipes it when it changes hands, so
 * nothing one person saw can be served to the next on a shared device.
 */

/**
 * IndexedDB rather than localStorage: localStorage is synchronous, caps out a few
 * megabytes in, and blocks the main thread on every write.
 */
const store = createStore("campfire", "queries")

const storage: AsyncStorage = {
  // The library's contract is `null` for a miss, not `undefined` – one of the few places
  // the repository's own preference gives way to an external type.
  // eslint-disable-next-line unicorn/no-null -- AsyncStorage.getItem is typed to return null
  getItem: async (key) => (await get(key, store)) ?? null,
  removeItem: async (key) => {
    await del(key, store)
  },
  setItem: async (key, value) => {
    await set(key, value, store)
  },
}

/**
 * A persister that writes each query separately, keyed by its hash. `persistQueryClient`
 * – the better-known one – re-serializes the whole cache on every mutation, which stalls
 * the UI once the cache is large; this one persists per query and restores lazily, so the
 * cost stays flat as the list of participants grows.
 */
const persister = createQueryPersister({
  // The cached shapes' version. A cache written by an older build cannot serve rows that
  // are missing today's fields, so a bump discards those entries and refetches instead.
  buster: "2",
  // Thirty days, not the library's twenty-four hours, and the same span as `gcTime` –
  // the default would drop the whole cache on the jamboree's second day, which is
  // exactly when the network is worst and the cache matters most.
  maxAge: 30 * 24 * 60 * 60 * 1000,
  storage,
})

/**
 * The application's one query client – see this file's opening note for the defaults and
 * why they are not the library's.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 30 * 24 * 60 * 60 * 1000,
      networkMode: "offlineFirst",
      persister: persister.persisterFn,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 24 * 60 * 60 * 1000,
    },
  },
})

/**
 * The key the cache's owner is remembered under, beside the persisted queries. Not a
 * query hash, so it can never collide with one.
 */
const ownerKey = "campfire-cache-owner"

/**
 * Hand the cache to the signed-in person, wiping it first when it belonged to somebody
 * else. What a person may read is scoped to them – a leader's cached unit, health answers
 * included, must never be served to the next person who signs in on the same device. The
 * same person signing back in keeps their cache, which is the whole offline-first
 * promise; only a change of owner costs a refetch.
 *
 * The session gate awaits this before any screen mounts, so a previous owner's answers
 * are gone before the first query could read one.
 * @param memberNo The signed-in person's member number.
 * @returns Nothing, once the cache is theirs.
 */
export async function adoptCacheOwner(memberNo: string): Promise<void> {
  const owner: unknown = await get(ownerKey, store)
  if (owner === memberNo) {
    return
  }
  queryClient.clear()
  await clear(store)
  await set(ownerKey, memberNo, store)
}

/**
 * Forget everything the cache holds, the owner included, so the next sign-in – whoever it
 * is – starts from what the services answer now. Signing out is the one deliberate start
 * over a person has, and a cache that survived it would keep answering with what the last
 * session saw.
 * @returns Nothing, once both the client and the store are empty.
 */
export async function forgetCache(): Promise<void> {
  queryClient.clear()
  await clear(store)
}
