import { fetch } from "@scouterna/wsj27-campfire-utils"

import type { PatrolWrite } from "../model/Patrol"

/**
 * What a save came to: the writes the service took, and the ones it did not.
 */
export interface PatrolSave {
  /**
   * The writes that did not land, in the order they were asked for.
   */
  readonly failed: readonly PatrolWrite[]
  /**
   * The writes the service stored.
   */
  readonly saved: readonly PatrolWrite[]
}

// The service writes each patrol through to Scoutnet one at a time behind a lock, so more
// requests in flight than this only queue there instead of here.
const inFlight = 4

/**
 * Stores one person's patrol. Only a leader of the person's own unit may, and anybody
 * else is answered 404.
 * @param write Whose patrol, and what to store – null for none.
 */
async function savePatrol(write: PatrolWrite): Promise<void> {
  // Encoded because a member number from a service payload must not be able to rewrite
  // the path it is written to.
  await fetch<unknown>(`/api/project/participants/${encodeURIComponent(write.memberNo)}/patrol`, {
    body: { patrol: write.patrol },
    method: "POST",
  })
}

/**
 * Stores every write, a few at a time. The service has no endpoint for more than one
 * person, so a save is as many requests as it has writes, and each lands or fails on
 * its own – a failure is kept apart rather than thrown, so what did land is never lost
 * and the leader can be told who did not.
 * @param writes The patrols to store.
 * @returns The writes that landed, and the ones that did not.
 */
export async function savePatrols(writes: readonly PatrolWrite[]): Promise<PatrolSave> {
  const saved: PatrolWrite[] = []
  const failed: PatrolWrite[] = []
  const queue = [...writes]

  const worker = async (): Promise<void> => {
    for (let write = queue.shift(); write !== undefined; write = queue.shift()) {
      try {
        await savePatrol(write)
        saved.push(write)
      } catch {
        failed.push(write)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(inFlight, writes.length) }, worker))

  const order = new Map(writes.map((write, index) => [write.memberNo, index]))
  const byOrder = (left: PatrolWrite, right: PatrolWrite): number =>
    (order.get(left.memberNo) ?? 0) - (order.get(right.memberNo) ?? 0)
  return { failed: failed.toSorted(byOrder), saved: saved.toSorted(byOrder) }
}
