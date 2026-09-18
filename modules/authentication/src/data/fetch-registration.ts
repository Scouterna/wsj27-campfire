import { fetch, HttpError } from "@scouterna/wsj27-campfire-utils"
import { queryOptions, type UseQueryOptions } from "@tanstack/react-query"

import type { Registration } from "../model/Registration"
import { toRegistration, type IndividualDto } from "./dto/IndividualDto"

/**
 * The key the registration read is cached under: the module, the thing, and who it is
 * about, so two people's registrations never share an entry.
 */
type RegistrationQueryKey = readonly ["authentication", "registration", string]

/**
 * The settled "nothing known" answer. TanStack Query reserves `undefined` for "no data
 * yet", so an answer that means nothing must be its `null` – the one place this
 * repository trades in null on purpose.
 */
// eslint-disable-next-line unicorn/no-null -- TanStack Query forbids undefined as data
const nothingKnown = null

/**
 * Query options for what the list of participants says about somebody: their unit, and
 * how they travel.
 *
 * A refusal settles as nothing known: a 403 (the caller may not see this much) and a
 * 404 (the list of participants does not hold them) are answers, and will not become a
 * yes by asking again, so they are cached like one. Anything else – an unreachable
 * service, an answer that is not JSON – throws, so it is never remembered as "nothing
 * known" for the day the answer stays fresh. The query does not retry: the session
 * gate is waiting on it, and the caller goes on without the facts.
 * @param memberNo The Scoutnet member number to look up.
 * @returns The options to hand the query client.
 */
export function fetchRegistrationQuery(
  memberNo: string,
): UseQueryOptions<Registration | null, Error, Registration | null, RegistrationQueryKey> {
  return queryOptions({
    queryFn: async (): Promise<Registration | null> => {
      try {
        // Encoded because the number is read from a service payload: a value carrying
        // a reserved character must not rewrite the path or the query it is asked on.
        return toRegistration(
          await fetch<IndividualDto>(
            `/api/project/participants/individual/${encodeURIComponent(memberNo)}`,
          ),
        )
      } catch (error) {
        if (error instanceof HttpError && (error.status === 403 || error.status === 404)) {
          return nothingKnown
        }
        throw error
      }
    },
    queryKey: ["authentication", "registration", memberNo] as const,
    retry: false,
  })
}
