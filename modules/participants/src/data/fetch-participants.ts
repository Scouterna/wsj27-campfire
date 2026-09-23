import { fetch, HttpError } from "@scouterna/wsj27-campfire-utils"
import { queryOptions, type UseQueryOptions } from "@tanstack/react-query"

import type { Participant } from "../model/Participant"
import type { ParticipantsList } from "../model/ParticipantsList"
import { toParticipants } from "./dto/ParticipantDto"
import type { Viewer } from "./viewer"

/**
 * The key the assembled list is cached under. One viewer per session is what keeps it
 * constant – the cache changes owner with the sign-in rather than the key changing with
 * the reader.
 */
type ParticipantsQueryKey = readonly ["participants", "list"]

/**
 * What one round of listings answered: everyone the listings that came back hold, and the
 * keys of the ones worth asking again.
 */
interface Round {
  /**
   * The keys whose listing did not answer, in the order they were asked for – every
   * failure but a refusal, which asking again before the session is settled would only
   * repeat.
   */
  readonly failed: readonly string[]
  /**
   * Everyone the listings that did answer hold.
   */
  readonly people: readonly Participant[]
  /**
   * Why the round failed, kept so it can be rethrown rather than a message invented in
   * its place: the 401 whenever any listing was refused, since that is the one the query
   * client acts on, and otherwise the first failure.
   */
  readonly reason?: unknown
}

/**
 * Query options for the list of participants as the viewer may read it.
 *
 * The participants service has no "everyone I may see" endpoint – it lists one troop or
 * one member type at a time, and refuses what the caller may not read – so the list is
 * composed here. A leader asks for their own unit and gets exactly what they are allowed.
 * The contingent management walks the contingent the only way the service offers: the
 * leaders' listing names every unit, then each unit, the IST, and the management itself
 * are fetched and merged. Management wins over leadership for anybody who is both, because
 * the wider answer contains the narrower one.
 *
 * Describes the request rather than making it. Query options are what a route loader
 * prefetches with, a component reads with, and a test substitutes – one definition for all
 * three, which TanStack Query collapses into a single request and a single cache entry
 * however many callers there are.
 * @param viewer Who is reading, from `useViewer`.
 * @returns Options for `useQuery`, `useSuspenseQuery`, or `ensureQueryData`.
 */
export function fetchParticipantsQuery(
  viewer: Viewer,
): UseQueryOptions<ParticipantsList, Error, ParticipantsList, ParticipantsQueryKey> {
  return queryOptions({
    enabled: viewer.memberNo !== "",
    queryFn: async (): Promise<ParticipantsList> => {
      if (viewer.readsEveryone) {
        return { people: await wholeContingent(), scope: { kind: "all" } }
      }
      if (viewer.unitNumber !== undefined) {
        return {
          people: await listing(String(viewer.unitNumber)),
          scope: { kind: "unit", unitNumber: viewer.unitNumber },
        }
      }
      // Nobody the service would list anything for – every listing would come back a
      // refusal, so nothing is asked.
      return { people: [], scope: { kind: "nobody" } }
    },
    queryKey: ["participants", "list"] as const,
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
 * One troop's people, or one member type's. An empty listing answers 404 – the service's
 * shape for "nothing here" – which for a composed list means no rows, not a failure.
 * @param key The listing to read – a unit number, `al`, `ist`, or `cmt`.
 * @returns The people the listing holds, empty when it holds none.
 */
async function listing(key: string): Promise<readonly Participant[]> {
  try {
    // Encoded because a unit number derived from a service payload must not be able to
    // rewrite the path or the query it is asked on.
    const rows = await fetch<unknown>(
      `/api/project/participants/troopinfo/${encodeURIComponent(key)}?infolevel=basic`,
    )
    return toParticipants(rows)
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) {
      return []
    }
    throw error
  }
}

/**
 * Every listing at once, with the failures kept apart from the rows rather than taking the
 * whole round down – which is what lets only the failed ones be asked again.
 * @param keys The listings to read.
 * @returns The people that came back, the keys worth asking again, and why the round
 * failed.
 */
async function round(keys: readonly string[]): Promise<Round> {
  const settled = await Promise.allSettled(keys.map(async (key) => listing(key)))
  const failed: string[] = []
  const people: Participant[] = []
  let firstFailure: unknown
  let refusal: HttpError | undefined

  for (const [index, key] of keys.entries()) {
    // Promise.allSettled answers in the order it was asked, so the outcomes line up with
    // the keys; an outcome that somehow is not there counts as a failure.
    // eslint-disable-next-line security/detect-object-injection -- index is the key list's own
    const outcome = settled[index]
    if (outcome?.status === "fulfilled") {
      people.push(...outcome.value)
      continue
    }
    const why: unknown = outcome?.reason
    if (isRefusal(why)) {
      refusal ??= why
    } else {
      failed.push(key)
      firstFailure ??= why
    }
  }

  const reason = refusal ?? firstFailure
  return { failed, people, ...(reason !== undefined && { reason }) }
}

/**
 * The whole contingent: every unit the leaders' listing names, the IST, and the contingent
 * management, merged and deduplicated by member number – a leader appears in their unit's
 * listing as well as in the leaders' one, and is one person either way.
 *
 * A unit, IST, or management listing that fails for anything but a 404 or a 401 is asked
 * once more, on its own. If it still fails – or the leaders' listing, which names the
 * units and is asked only once, fails at all – so does the whole query: a partial
 * contingent looks exactly like a complete one to whoever is reading it, and "this unit is
 * missing" is not a thing a screen can say about a list it cannot tell is short. A
 * listing refused with 401 is not asked again here, and the refusal is what the query
 * throws, in either round and ahead of any other failure – whether to ask again is the
 * query client's call, once it knows who is signed in.
 * @returns Everyone in the contingent, each of them once.
 */
async function wholeContingent(): Promise<readonly Participant[]> {
  const leaders = await listing("al")
  const units = [
    ...new Set(
      leaders
        .map((leader) => leader.unitNumber)
        .filter((unit): unit is number => unit !== undefined),
    ),
  ].map(String)

  const first = await round([...units, "ist", "cmt"])
  const second = first.failed.length > 0 ? await round(first.failed) : undefined

  const refusal = [first.reason, second?.reason].find((reason) => isRefusal(reason))
  if (refusal !== undefined) {
    throw refusal
  }
  if (second !== undefined && second.failed.length > 0) {
    // Rethrown rather than wrapped: the original names the address that refused, which
    // is what reading the failure in a console needs.
    throw second.reason instanceof Error
      ? second.reason
      : new Error("The list of participants could not be assembled", { cause: second.reason })
  }
  const people = [...first.people, ...(second?.people ?? [])]

  const byMemberNo = new Map<string, Participant>()
  for (const person of [...leaders, ...people]) {
    byMemberNo.set(person.memberNo, person)
  }
  return byMemberNo.values().toArray()
}
