import type { Decorator } from "@storybook/react-vite"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect, useState, type ReactElement } from "react"

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
export interface ApiParameters {
  /**
   * What one person's record answers with, each seeded under its own member number.
   */
  readonly details?: readonly ParticipantDetail[]
  /**
   * What the list of participants answers with.
   */
  readonly list?: ParticipantsList
  /**
   * The state of the network instead of an answer: a request that never returns, or one
   * the service refuses. Whatever is seeded above is still served from the cache.
   */
  readonly state?: "error" | "pending"
  /**
   * Who is reading. The widest viewer when unsaid.
   */
  readonly viewer?: Viewer
}

/**
 * A cache with the story's answers already in it. Nothing is stale and nothing is
 * retried, so what the story seeds is what the screen reads, and a refusal shows the
 * first time rather than after the query client's retries.
 * @param api What the story said about the service.
 * @returns The client to put under the story.
 */
function makeClient(api: ApiParameters): QueryClient {
  const viewer = api.viewer ?? storyViewer
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })

  if (api.list !== undefined) {
    client.setQueryData(fetchParticipantsQuery(viewer).queryKey, api.list)
  }
  const details = api.details ?? []
  for (const detail of details) {
    client.setQueryData(fetchParticipantQuery(detail.memberNo, viewer).queryKey, detail)
  }

  return client
}

const realFetch = fetch

/**
 * The address a request was made to, whichever shape it arrived in.
 * @param input What the caller passed as the request.
 * @returns The address, as a string.
 */
function addressOf(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input
  }
  return input instanceof URL ? input.href : input.url
}

/**
 * The network as the story asked for it. Only the participants service's own addresses
 * are answered here; anything else goes to the real network, so the stub cannot take a
 * font or an image down with it.
 * @param state The state the story asked for.
 * @returns The stub to install.
 */
function stubFetch(state: ApiParameters["state"]): typeof fetch {
  return async (input, init) => {
    const url = addressOf(input)
    if (!url.includes("/api/project/participants")) {
      return realFetch(input, init)
    }
    if (state === "pending") {
      return new Promise<Response>(() => {
        // Never settles – the screen stays in its pending state for as long as it is
        // looked at.
      })
    }
    return new Response("", { status: 503, statusText: "Service Unavailable" })
  }
}

/**
 * Puts a seeded query cache under a story that reads the list of participants, and a
 * network in the state the story asked for.
 *
 * A story without `parameters.api` gets an empty cache and the real network – which in
 * the catalog answers nothing, so the story would sit pending forever. Say what the list
 * holds instead.
 * @param Story The story being rendered.
 * @param context The story's own parameters.
 * @returns The story, with a viewer and a cache around it.
 */
export const ApiDecorator: Decorator = (Story, context): ReactElement => {
  const api = (context.parameters["api"] ?? {}) as ApiParameters
  const [client] = useState(() => makeClient(api))

  // Installed before the first query can fire, and put back when the story leaves. The
  // stub is read on every call, so a story that seeds everything never reaches it.
  if (api.state !== undefined) {
    // eslint-disable-next-line unicorn/no-global-object-property-assignment -- the story's network is a test double, installed and removed again below
    globalThis.fetch = stubFetch(api.state)
  }
  useEffect(
    () => () => {
      // eslint-disable-next-line unicorn/no-global-object-property-assignment -- the real network, put back
      globalThis.fetch = realFetch
    },
    [],
  )

  return (
    <ViewerProvider viewer={api.viewer ?? storyViewer}>
      <QueryClientProvider client={client}>
        <Story />
      </QueryClientProvider>
    </ViewerProvider>
  )
}
