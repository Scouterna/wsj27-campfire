import { RolesProvider, type Role } from "@scouterna/wsj27-campfire-utils"
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
  return (
    <RolesProvider roles={parameters.roles ?? [{ kind: "leader", unitNumber: 1 }]}>
      <Story />
    </RolesProvider>
  )
}

/**
 * The contingent management, for the story that shows the color picker.
 */
export const management: readonly Role[] = [{ kind: "cmt" }]
