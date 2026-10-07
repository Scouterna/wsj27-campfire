import { RolesProvider, type Role } from "@scouterna/wsj27-campfire-utils"
import type { Decorator } from "@storybook/react-vite"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect, useState, type ReactElement } from "react"

import { fetchHandbookQuery } from "../../data/fetch-handbook"
import type { HandbookPage } from "../../model/Handbook"

/**
 * What a story says about the CMS behind it, under `parameters.handbook`.
 */
export interface HandbookParameters {
  /**
   * What the handbook answers with.
   */
  readonly pages?: readonly HandbookPage[]
  /**
   * The roles the reader holds – none when unsaid, so the editor's menu shows only where
   * a story asks for it.
   */
  readonly roles?: readonly Role[]
  /**
   * The state of the network instead of an answer: a request that never returns, or one
   * the CMS refuses.
   */
  readonly state?: "error" | "pending"
}

const realFetch = fetch

/**
 * The network as the story asked for it – never settling, or refusing.
 * @param state The state the story asked for.
 * @returns The stub to install.
 */
function stubFetch(state: NonNullable<HandbookParameters["state"]>): typeof fetch {
  return async () => {
    if (state === "pending") {
      return new Promise<Response>(() => {
        // Never settles, so the screen stays pending for as long as it is looked at.
      })
    }
    return new Response("", { status: 503, statusText: "Service Unavailable" })
  }
}

/**
 * Puts a seeded query cache under a story that reads the handbook, the reader's roles
 * around it, and a network in the state the story asked for.
 * @param Story The story being rendered.
 * @param context The story's own parameters.
 * @returns The story, with a cache and roles around it.
 */
export const HandbookDecorator: Decorator = (Story, context): ReactElement => {
  const parameters = (context.parameters["handbook"] ?? {}) as HandbookParameters
  const [client] = useState(() => {
    const seeded = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    })
    if (parameters.pages !== undefined) {
      seeded.setQueryData(fetchHandbookQuery().queryKey, parameters.pages)
    }
    return seeded
  })

  if (parameters.state !== undefined) {
    // eslint-disable-next-line unicorn/no-global-object-property-assignment -- the story's network is a test double, installed and removed again below
    globalThis.fetch = stubFetch(parameters.state)
  }
  useEffect(
    () => () => {
      // eslint-disable-next-line unicorn/no-global-object-property-assignment -- the real network, put back
      globalThis.fetch = realFetch
    },
    [],
  )

  return (
    <RolesProvider roles={parameters.roles ?? []}>
      <QueryClientProvider client={client}>
        <Story />
      </QueryClientProvider>
    </RolesProvider>
  )
}
