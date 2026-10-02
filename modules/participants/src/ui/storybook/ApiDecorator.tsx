import { queryDecorator, type NetworkParameters } from "@scouterna/wsj27-campfire-ui"

import { fetchParticipantQuery } from "../../data/fetch-participant"
import { fetchParticipantsQuery } from "../../data/fetch-participants"
import { ViewerProvider, type Viewer } from "../../data/viewer"
import type { ParticipantDetail } from "../../model/ParticipantDetail"
import type { ParticipantsList } from "../../model/ParticipantsList"

/**
 * The viewer a story runs as when it names none: the widest one, so whatever the story
 * seeds is in scope. Stories exercise screens, not the participants service's gates.
 */
const storyViewer: Viewer = { memberNo: "1", readsEveryone: true, readsHealth: true }

/**
 * What a story says about the participants service behind it, under `parameters.api`.
 */
export interface ApiParameters extends NetworkParameters {
  /**
   * What one person's record answers with, each seeded under its own member number.
   */
  readonly details?: readonly ParticipantDetail[]
  /**
   * What the list of participants answers with.
   */
  readonly list?: ParticipantsList
  /**
   * Who is reading. The widest viewer when unsaid.
   */
  readonly viewer?: Viewer
}

/**
 * Puts a cache seeded with the story's list and records under a story, read as the
 * story's viewer, and the participants service in the state it asked for. Say what the
 * list holds, or the story sits pending.
 */
export const ApiDecorator = queryDecorator<ApiParameters>({
  seed: (client, api) => {
    const viewer = api.viewer ?? storyViewer
    if (api.list !== undefined) {
      client.setQueryData(fetchParticipantsQuery(viewer).queryKey, api.list)
    }
    const details = api.details ?? []
    for (const detail of details) {
      client.setQueryData(fetchParticipantQuery(detail.memberNo, viewer).queryKey, detail)
    }
  },
  service: "/api/project/participants",
  wrap: (story, api) => <ViewerProvider viewer={api.viewer ?? storyViewer}>{story}</ViewerProvider>,
})
