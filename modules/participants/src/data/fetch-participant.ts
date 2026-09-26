import { fetch, HttpError } from "@scouterna/wsj27-campfire-utils"
import { queryOptions, type UseQueryOptions } from "@tanstack/react-query"

import type { ParticipantDetail } from "../model/ParticipantDetail"
import { toParticipantDetail, type ParticipantDetailDto } from "./dto/ParticipantDetailDto"
import type { Viewer } from "./viewer"

/**
 * The key one person's record is cached under: the module, the thing, and who it is about,
 * so opening several people in turn caches each of them separately.
 */
type ParticipantQueryKey = readonly ["participants", "detail", string]

/**
 * How much of a record to ask for. `full` carries the health and dietary answers; `basic`
 * carries everything else.
 */
type InfoLevel = "basic" | "full"

/**
 * Query options for one person in full, with everything they answered when they signed up –
 * as much of it as the viewer may read.
 *
 * The info level is the viewer's best case. A leader reads their own unit in full and a
 * health grant reads everyone in full, so both start at `full`, and management without
 * the grant may not, so they start at `basic`. The one seam is a leader who also serves in the
 * management, reading outside their unit – `full` answers 403 where `basic` would answer,
 * so a 403 retries once at `basic` rather than reading as a failure. A second refusal is
 * the answer.
 *
 * A member number nobody holds throws, and so does one outside the viewer's scope, on
 * purpose indistinguishably – the service answers 404 to both, and so does a payload that
 * is not a person. The screen words all of them the same way.
 * @param memberNo The person's member number, as a listing row carries it.
 * @param viewer Who is reading.
 * @returns Options for `useQuery`, `useSuspenseQuery`, or `ensureQueryData`.
 */
export function fetchParticipantQuery(
  memberNo: string,
  viewer: Viewer,
): UseQueryOptions<ParticipantDetail, Error, ParticipantDetail, ParticipantQueryKey> {
  return queryOptions({
    enabled: viewer.memberNo !== "",
    queryFn: async (): Promise<ParticipantDetail> => fetchParticipant(memberNo, viewer),
    queryKey: ["participants", "detail", memberNo] as const,
  })
}

/**
 * The record itself: asked at the viewer's best level, stepped down once on a refusal, and
 * converted or thrown.
 * @param memberNo The person's member number.
 * @param viewer Who is reading.
 * @returns The person, in as much detail as the viewer may read.
 */
async function fetchParticipant(memberNo: string, viewer: Viewer): Promise<ParticipantDetail> {
  let level: InfoLevel = viewer.readsHealth || viewer.unitNumber !== undefined ? "full" : "basic"
  let dto: ParticipantDetailDto
  try {
    dto = await ask(memberNo, level)
  } catch (error) {
    if (level === "full" && error instanceof HttpError && error.status === 403) {
      // The step-down is remembered, so an error below names the ask that answered.
      level = "basic"
      dto = await ask(memberNo, level)
    } else {
      throw error
    }
  }

  const person = toParticipantDetail(dto)
  if (person === undefined) {
    throw new Error(`${address(memberNo, level)} answered with something that is not a person`)
  }
  return person
}

/**
 * One question to the service, at one level.
 * @param memberNo The person's member number.
 * @param level How much of the record to ask for.
 * @returns The record the service answered with.
 */
async function ask(memberNo: string, level: InfoLevel): Promise<ParticipantDetailDto> {
  return fetch<ParticipantDetailDto>(address(memberNo, level))
}

/**
 * Where one person is asked for. Encoded because the member number is read from a service
 * payload, and a reserved character in it must not rewrite the path it is asked on.
 * @param memberNo The person's member number.
 * @param level How much of the record to ask for.
 * @returns The origin-relative address.
 */
function address(memberNo: string, level: InfoLevel): string {
  return `/api/project/participants/individual/${encodeURIComponent(memberNo)}?infolevel=${level}`
}
