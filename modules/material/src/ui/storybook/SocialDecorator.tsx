import { RolesProvider, UserProvider, type Role, type User } from "@scouterna/wsj27-campfire-utils"
import type { Decorator } from "@storybook/react-vite"
import type { ReactElement } from "react"

/**
 * What a story says about who is looking, under `parameters.roles`.
 */
export interface RolesParameters {
  /**
   * The roles in force. A leader of unit 1 when the story says nothing, because that is
   * who this screen is mostly for.
   */
  readonly roles?: readonly Role[]
}

/**
 * The roles a story of the image maker runs as – the one thing that screen changes shape
 * for, because the contingent management picks a color and a unit wears its own.
 * @param Story The story being rendered.
 * @param context The story's own parameters.
 * @returns The story, with roles around it.
 */
export const SocialDecorator: Decorator = (Story, context): ReactElement => {
  const parameters = (context.parameters["roles"] ?? {}) as RolesParameters
  const roles = parameters.roles ?? leader
  return (
    <RolesProvider roles={roles}>
      <UserProvider user={storyUser(roles)}>
        <Story />
      </UserProvider>
    </RolesProvider>
  )
}

/**
 * A leader of unit 1.
 */
const leader: readonly Role[] = [{ kind: "leader", unitNumber: 1 }]

/**
 * Whoever a story's roles describe, since the screen reads a leader's unit off the person
 * rather than off the roles.
 * @param roles The roles in force.
 * @returns The person, in the unit a leader's role places them in.
 */
function storyUser(roles: readonly Role[]): User {
  const unitNumber = roles.find((role) => role.kind === "leader")?.unitNumber
  return {
    firstName: "Lars",
    memberNo: "1",
    name: "Lars Lindberg",
    roleLine: "Ledare",
    roleLineWithUnit: "Ledare",
    roles,
    ...(unitNumber !== undefined && { unit: { number: unitNumber } }),
  }
}

/**
 * The contingent management, for the story that shows the color picker.
 */
export const management: readonly Role[] = [{ kind: "cmt" }]
