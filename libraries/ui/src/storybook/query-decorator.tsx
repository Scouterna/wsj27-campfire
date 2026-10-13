import type { Decorator } from "@storybook/react-vite"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect, useState, type ReactElement } from "react"

/**
 * What every story behind a `queryDecorator` may say under `parameters.api`, beside what
 * its module seeds.
 */
export interface NetworkParameters {
  /**
   * The state of the service instead of an answer: a request that never returns, or one
   * the service refuses. Whatever the story seeds is still served from the cache.
   */
  readonly state?: "error" | "pending"
}

/**
 * How a module's stories reach the cache: what to seed it with, which service a network
 * state stands in for, and what else the module's queries read.
 */
export interface QueryDecoratorOptions<P extends NetworkParameters> {
  /**
   * Fills the cache with what the story said under `parameters.api`, by the module's own
   * query keys – so only the module's query factories ever know an address.
   */
  readonly seed: (client: QueryClient, api: P) => void
  /**
   * The address prefix a pending or refused state applies to. Every other address on
   * the catalog's origin reaches the real network, so the stub cannot take a font or an
   * image down with it.
   */
  readonly service: string
  /**
   * Wraps the story inside the cache, for a provider the module's queries read.
   */
  readonly wrap?: (story: ReactElement, api: P) => ReactElement
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
 * The network as the story asked for it. Nothing off the catalog's own origin is
 * reached – a map's tile service included – so a story draws what it would draw offline.
 * @param service The address prefix the state applies to.
 * @param state The state the story asked for, or undefined to serve the seeded cache.
 * @returns The stub to install.
 */
function stubFetch(service: string, state: NetworkParameters["state"]): typeof fetch {
  return async (input, init) => {
    const url = addressOf(input)
    if (new URL(url, location.href).origin !== location.origin) {
      // What the browser answers when a request reaches nothing.
      throw new TypeError("Failed to fetch")
    }
    if (state === undefined || !url.includes(service)) {
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
 * Builds a module's decorator for stories that read through its queries: a cache seeded
 * with what each story says under `parameters.api`, and a network in the state it asked
 * for, with nothing beyond the catalog's origin.
 *
 * Nothing is stale and nothing is retried, so what a story seeds is what the screen reads,
 * and a refusal shows the first time rather than after the query client's retries. A
 * story that seeds nothing reads the real network, which in the catalog answers nothing,
 * so it sits pending forever; a write a story makes fails the way a refused write does.
 * @param options What to seed the cache with, and which service a state stands in for.
 * @returns The decorator.
 */
export function queryDecorator<P extends NetworkParameters>(
  options: QueryDecoratorOptions<P>,
): Decorator {
  const QueryDecorated: Decorator = (Story, context): ReactElement => {
    const api = (context.parameters["api"] ?? {}) as P
    const [client] = useState(() => {
      const seeded = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
      })
      options.seed(seeded, api)
      return seeded
    })

    // Installed before the first query can fire, and put back when the story leaves.
    // eslint-disable-next-line unicorn/no-global-object-property-assignment -- the story's network is a test double, installed and removed again below
    globalThis.fetch = stubFetch(options.service, api.state)
    useEffect(
      () => () => {
        // eslint-disable-next-line unicorn/no-global-object-property-assignment -- the real network, put back
        globalThis.fetch = realFetch
      },
      [],
    )

    const story = <Story />
    return (
      <QueryClientProvider client={client}>
        {options.wrap === undefined ? story : options.wrap(story, api)}
      </QueryClientProvider>
    )
  }
  return QueryDecorated
}
