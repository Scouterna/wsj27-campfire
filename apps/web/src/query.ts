import { withSession } from "@scouterna/wsj27-campfire-authentication"
import {
  experimental_createQueryPersister as createQueryPersister,
  type AsyncStorage,
} from "@tanstack/query-persist-client-core"
import { QueryClient, type QueryPersister } from "@tanstack/react-query"
import { clear, createStore, del, get, set } from "idb-keyval"

/**
 * The application's one query client, and the store that keeps its answers across a cold
 * start.
 *
 * The defaults are ADR 017's, set for a field in Poland rather than for a desk. A screen
 * draws what the cache holds at once and asks for a fresh answer every time it mounts,
 * answers survive for thirty days, and a query fires even when the browser believes it is
 * offline, because a webview's guess about a camp site's connectivity is not to be
 * trusted. A fresh answer that fails leaves the cached one in place. Focus and reconnect
 * refetch nothing, because a phone waking up in a field is not a reason to ask.
 *
 * Every service read goes through this client, so one cache holds every answer and one
 * IndexedDB store persists it query by query, with every read that reaches the network
 * run under the session. The cache belongs to one member number at a time.
 */

/**
 * IndexedDB rather than localStorage, because localStorage is synchronous, caps out a
 * few megabytes in, and blocks the main thread on every write.
 */
const store = createStore("campfire", "queries")

/**
 * Whether the cache has been forgotten on this page. The persister saves a read on a
 * later tick than the read resolved on, so a read that finished just before a session
 * ended could otherwise write its answer back after `forgetCache` cleared the store.
 * Never unset, because forgetting ends a session or signs out, and both end in a page
 * load.
 */
const forgotten = { value: false }

const storage: AsyncStorage = {
  // eslint-disable-next-line unicorn/no-null -- AsyncStorage.getItem is typed to return null
  getItem: async (key) => (await get(key, store)) ?? null,
  removeItem: async (key) => {
    await del(key, store)
  },
  setItem: async (key, value) => {
    if (forgotten.value) {
      return
    }
    await set(key, value, store)
  },
}

/**
 * A persister that writes each query separately, keyed by its hash, and restores lazily,
 * so the cost stays flat as the list of participants grows instead of the whole cache
 * being re-serialized on every change.
 */
const persister = createQueryPersister({
  // The cached shapes' version. Bump it whenever a persisted payload's shape changes,
  // because a stale shape read as a fresh one is worse than a cold cache.
  buster: "5",
  // Thirty days, not the library's twenty-four hours, and the same span as `gcTime` –
  // the default would drop the whole cache on the jamboree's second day, which is
  // exactly when the network is worst and the cache matters most.
  maxAge: 30 * 24 * 60 * 60 * 1000,
  storage,
})

/**
 * The persister with every network read run under the session, so a refusal asks the
 * auth service again and the read runs once more only when the same person is still
 * signed in. A restore from IndexedDB never calls the query function and so never asks.
 * What a refusal means is the authentication module's to decide; this only puts the
 * read where it can.
 *
 * The client's single retry bounds it – a same-person rerun refused again rethrows, the
 * client runs the whole query function once more, and that is two asks per fetch at
 * most.
 * @param queryFunction The query's own function, run under the session when it runs.
 * @param context The query function's context, handed through.
 * @param query The query being fetched, handed through.
 * @returns What the persister resolves – the restored answer, or the read's.
 */
const persisterWithSession: QueryPersister = (queryFunction, context, query) =>
  persister.persisterFn((c) => withSession(() => Promise.resolve(queryFunction(c))), context, query)

/**
 * The application's one query client – see this file's opening note for the defaults and
 * why they are not the library's.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 30 * 24 * 60 * 60 * 1000,
      networkMode: "offlineFirst",
      persister: persisterWithSession,
      refetchOnMount: "always",
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      retry: 1,
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
  // Before anything is cleared, so no save can land between the clear and the flag.
  forgotten.value = true
  queryClient.clear()
  // The owner goes first, so a clear that fails partway still leaves no owner – and the
  // next sign-in's adoption wipes whatever survived.
  await del(ownerKey, store)
  await clear(store)
}
