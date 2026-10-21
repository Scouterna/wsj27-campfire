import type { Decorator } from "@storybook/react-vite"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactElement } from "react"

import { fetchFaqQuery } from "../../data/fetch-faq"
import type { FaqFolder } from "../../model/Faq"

/**
 * What a story says about the FAQ behind it, under `parameters.faq`.
 */
export interface FaqParameters {
  /**
   * The folders the screens read. A story that seeds none gets an empty FAQ.
   */
  readonly folders?: readonly FaqFolder[]
  /**
   * A read that never answers, or one the help center refuses, in place of whatever
   * folders the story seeded.
   */
  readonly state?: "error" | "pending"
}

/**
 * A request that never answers, so a screen stays in its pending state for as long as it
 * is looked at.
 * @returns A promise that never settles.
 */
function neverAnswers(): Promise<never> {
  return new Promise<never>(() => {
    // Deliberately never resolved and never rejected.
  })
}

/**
 * A read that fails, which is how a screen sees the help center refuse.
 * @returns A promise that always rejects.
 */
function refuses(): Promise<never> {
  return Promise.reject(new Error("The help center refused the folder"))
}

/**
 * A cache in the state the story asked for: its folders already in it, or a query
 * function that hangs or fails in place of them. Nothing goes stale and nothing is
 * retried, so what the story seeds is what the screen reads.
 * @param faq What the story said about the FAQ.
 * @returns The client to put under the story.
 */
function makeClient(faq: FaqParameters): QueryClient {
  const queries = { retry: false as const, staleTime: Infinity }

  if (faq.state === "pending") {
    return new QueryClient({ defaultOptions: { queries: { ...queries, queryFn: neverAnswers } } })
  }
  if (faq.state === "error") {
    return new QueryClient({ defaultOptions: { queries: { ...queries, queryFn: refuses } } })
  }

  const client = new QueryClient({ defaultOptions: { queries } })
  client.setQueryData(fetchFaqQuery().queryKey, faq.folders ?? [])
  return client
}

/**
 * Puts a seeded query cache under a story that reads the FAQ. A story without
 * `parameters.faq` gets an empty one.
 * @param Story The story being rendered.
 * @param context The story's own parameters.
 * @returns The story, with a cache around it.
 */
export const FaqDecorator: Decorator = (Story, context): ReactElement => {
  const faq = (context.parameters["faq"] ?? {}) as FaqParameters
  const [client] = useState(() => makeClient(faq))

  return (
    <QueryClientProvider client={client}>
      <Story />
    </QueryClientProvider>
  )
}
