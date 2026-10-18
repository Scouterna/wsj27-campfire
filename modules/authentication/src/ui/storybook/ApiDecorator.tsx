import { queryDecorator, type NetworkParameters } from "@scouterna/wsj27-campfire-ui"
import { UserProvider, type User } from "@scouterna/wsj27-campfire-utils"

import {
  fetchImpersonationOfferQuery,
  fetchImpersonationTargetsQuery,
} from "../../data/impersonation"
import { admin } from "./fixtures"

/**
 * What a story says about the services behind it, under `parameters.api`. Every answer is
 * in the service's own wire shape, because that is what the cache holds.
 */
export interface ApiParameters extends NetworkParameters {
  /**
   * Whether the auth service offers impersonation. Not offered when unsaid, as in
   * production.
   */
  readonly offered?: boolean
  /**
   * The leaders' and the management's listing rows the people to choose from are read
   * from.
   */
  readonly targets?: readonly unknown[]
  /**
   * Who is signed in, which decides whether impersonation is offered. The management's
   * admin when unsaid; a story that signs somebody in itself overrides it.
   */
  readonly user?: User
}

/**
 * Puts a cache seeded with the story's offer and people under a story, signed in as the
 * story's user, and the services in the state it asked for.
 */
export const ApiDecorator = queryDecorator<ApiParameters>({
  seed: (client, api) => {
    client.setQueryData(fetchImpersonationOfferQuery().queryKey, api.offered ?? false)
    if (api.targets !== undefined) {
      client.setQueryData(fetchImpersonationTargetsQuery().queryKey, api.targets)
    }
  },
  service: "/api/",
  wrap: (story, api) => <UserProvider user={api.user ?? admin}>{story}</UserProvider>,
})
