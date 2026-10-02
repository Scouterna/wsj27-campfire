import { fetch, HttpError } from "@scouterna/wsj27-campfire-utils"
import { queryOptions, type UseQueryOptions } from "@tanstack/react-query"

import type { People } from "../model/Person"
import { toPeople, toPerson } from "./dto/PersonDto"

/**
 * The key everyone's names are cached under.
 */
type PeopleQueryKey = readonly ["cases", "people"]

/**
 * How long the names count as fresh. Walking the contingent is dozens of requests, and
 * who is in it changes seldom, so a screen that opens within the hour reads the cache.
 */
const staleTime = 60 * 60 * 1000

/**
 * Query options for everyone in the contingent, by member number – the names a case and
 * a note are shown with, and the people a new case can be about.
 *
 * The participants service lists one troop or one member type at a time, so the
 * contingent is walked here: the leaders' listing, every unit it names, the IST, and the
 * contingent management, all at the basic level the health team may read. A listing that
 * fails for anything but a refusal is asked once more, and one that fails again fails the
 * whole query, because a contingent missing a unit looks complete, and nobody searching
 * for a person in it could tell. A 401 is never asked again and is thrown ahead of any
 * other failure, because it is the one the query client acts on.
 *
 * The cache holds the rows as they arrived and `select` converts them on the way out,
 * because the cache is persisted as JSON, which has no map.
 * @returns Options for `useQuery`, `useSuspenseQuery`, or the client's `query`.
 */
export function fetchPeopleQuery(): UseQueryOptions<unknown, Error, People, PeopleQueryKey> {
  return queryOptions({
    queryFn: wholeContingent,
    queryKey: ["cases", "people"] as const,
    // Only when stale, rather than the application's every mount, since the stale time
    // is what spares the walk.
    refetchOnMount: true,
    select: toPeople,
    staleTime,
  })
}

/**
 * Whether a listing failed because the service refused the session – a 401, which the
 * query client answers by asking who is signed in, not by asking the listing again.
 * @param error Why the listing failed.
 * @returns True for an `HttpError` with status 401.
 */
function isRefusal(error: unknown): error is HttpError {
  return error instanceof HttpError && error.status === 401
}

/**
 * One listing's rows. An empty listing answers 404 – the service's shape for "nothing
 * here" – which for the contingent means no rows, not a failure.
 * @param key The listing to read – a unit number, `al`, `ist`, or `cmt`.
 * @returns The rows as they arrived, empty when the listing holds none.
 */
async function listing(key: string): Promise<readonly unknown[]> {
  try {
    // Encoded because a unit number read from a service payload must not be able to
    // rewrite the path or the query it is asked on.
    const rows = await fetch<unknown>(
      `/api/project/participants/troopinfo/${encodeURIComponent(key)}?infolevel=basic`,
    )
    return Array.isArray(rows) ? (rows as readonly unknown[]) : []
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      return []
    }
    throw error
  }
}

/**
 * What one round of listings came back with.
 */
interface Round {
  /**
   * The listings that failed for anything but a refusal, worth asking again.
   */
  readonly failed: readonly string[]
  /**
   * Why the first of them failed, undefined when none did.
   */
  readonly reason?: unknown
  /**
   * The refusal, when a listing answered 401.
   */
  readonly refusal?: HttpError
  /**
   * The rows of every listing that answered.
   */
  readonly rows: readonly unknown[]
}

/**
 * Every listing at once, with the failures kept apart from the rows rather than taking
 * the whole round down – which is what lets only the failed ones be asked again.
 * @param keys The listings to read.
 * @returns The rows that came back, the keys worth asking again, and why the round failed.
 */
async function round(keys: readonly string[]): Promise<Round> {
  const settled = await Promise.allSettled(keys.map(async (key) => listing(key)))
  const failed: string[] = []
  const rows: unknown[] = []
  let reason: unknown
  let refusal: HttpError | undefined

  for (const [index, key] of keys.entries()) {
    // The outcomes line up with the keys, and one that is somehow missing counts as a
    // failure.
    // eslint-disable-next-line security/detect-object-injection -- index is the key list's own
    const outcome = settled[index]
    if (outcome?.status === "fulfilled") {
      rows.push(...outcome.value)
      continue
    }
    const why: unknown = outcome?.reason
    if (isRefusal(why)) {
      refusal ??= why
    } else {
      failed.push(key)
      reason ??= why
    }
  }

  return { failed, rows, ...(reason !== undefined && { reason }), ...(refusal && { refusal }) }
}

/**
 * Every row of every listing in the contingent, the leaders' first.
 * @returns The rows, one listing after the other, with a leader appearing twice.
 */
async function wholeContingent(): Promise<unknown> {
  const leaders = await listing("al")
  const units = new Set<string>()
  for (const row of leaders) {
    const troop = toPerson(row)?.troop
    if (troop !== undefined && /^\d+$/u.test(troop)) {
      units.add(troop)
    }
  }

  const first = await round([...units, "ist", "cmt"])
  const second = first.failed.length > 0 ? await round(first.failed) : undefined

  const refusal = first.refusal ?? second?.refusal
  if (refusal !== undefined) {
    throw refusal
  }
  if (second !== undefined && second.failed.length > 0) {
    // Rethrown rather than wrapped, because the original names the address that failed.
    throw second.reason instanceof Error
      ? second.reason
      : new Error("The contingent could not be read", { cause: second.reason })
  }

  return [...leaders, ...first.rows, ...(second?.rows ?? [])]
}
