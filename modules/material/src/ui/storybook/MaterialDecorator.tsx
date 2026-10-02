import { UnitIdentitiesProvider, type UnitIdentities } from "@scouterna/wsj27-campfire-ui"
import { UserProvider, type User } from "@scouterna/wsj27-campfire-utils"
import type { Decorator } from "@storybook/react-vite"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, type ReactElement } from "react"

import { fetchMaterialQuery } from "../../data/fetch-material"
import type { MaterialNode } from "../../model/MaterialNode"

/**
 * What a story says about the material behind it, under `parameters.material`.
 */
export interface MaterialParameters {
  /**
   * A read that never answers, or one Drive refuses, in place of whatever tree the story
   * seeded.
   */
  readonly state?: "error" | "pending"
  /**
   * The tree the screens read. A story that seeds none gets an empty one.
   */
  readonly tree?: readonly MaterialNode[]
  /**
   * Who is signed in, for the story that shows a unit its own symbols. Nobody by
   * default, which is what hides the card.
   */
  readonly user?: User
}

/**
 * The units the stories know by name – only the signed-in person's own unit is ever
 * looked up.
 */
const identities: UnitIdentities = {
  glyphSrc: () => {
    // No glyphs in the catalog, so the avatar wears its number.
  },
  name: (unitNumber) => (unitNumber === 1 ? "Björnen" : undefined),
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
 * A read that fails, which is how a screen sees Drive refuse.
 * @returns A promise that always rejects.
 */
function refuses(): Promise<never> {
  return Promise.reject(new Error("Drive refused the listing"))
}

/**
 * A cache in the state the story asked for: its tree already in it, or a query function
 * that hangs or fails in place of one. Nothing goes stale and nothing is retried, so what
 * the story seeds is what the screen reads.
 * @param material What the story said about the material.
 * @returns The client to put under the story.
 */
function makeClient(material: MaterialParameters): QueryClient {
  const queries = { retry: false as const, staleTime: Infinity }

  if (material.state === "pending") {
    return new QueryClient({ defaultOptions: { queries: { ...queries, queryFn: neverAnswers } } })
  }
  if (material.state === "error") {
    return new QueryClient({ defaultOptions: { queries: { ...queries, queryFn: refuses } } })
  }

  const client = new QueryClient({ defaultOptions: { queries } })
  client.setQueryData(fetchMaterialQuery().queryKey, material.tree ?? [])
  return client
}

/**
 * Puts a seeded query cache under a story that reads the material, with the units'
 * identities and, where the story names one, the signed-in person the unit card reads.
 * A story without `parameters.material` gets an empty tree.
 * @param Story The story being rendered.
 * @param context The story's own parameters.
 * @returns The story, with a cache and a session around it.
 */
export const MaterialDecorator: Decorator = (Story, context): ReactElement => {
  const material = (context.parameters["material"] ?? {}) as MaterialParameters
  const [client] = useState(() => makeClient(material))

  return (
    <QueryClientProvider client={client}>
      <UnitIdentitiesProvider identities={identities}>
        {material.user === undefined ? (
          <Story />
        ) : (
          <UserProvider user={material.user}>
            <Story />
          </UserProvider>
        )}
      </UnitIdentitiesProvider>
    </QueryClientProvider>
  )
}

/**
 * A leader of unit 1, which the stories' identities name Björnen.
 */
export const bearLeader: User = {
  firstName: "Lars",
  mark: { isLeader: true, unitNumber: 1 },
  memberNo: "1",
  name: "Lars Lindberg",
  roleLine: "Ledare",
  roleLineWithUnit: "Ledare · Avdelning 1",
  roles: [{ kind: "leader", unitNumber: 1 }],
  unit: { number: 1 },
}
