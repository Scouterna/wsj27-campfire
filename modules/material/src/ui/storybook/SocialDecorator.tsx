import { UnitIdentitiesProvider, type UnitIdentities } from "@scouterna/wsj27-campfire-ui"
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
 * Two units, so the management story's list has something in it. The catalog never loads
 * the real ones: those are runtime data the application fetches.
 */
const identities: UnitIdentities = {
  glyphSrc: () => {
    // No glyphs in the catalog: the real ones are runtime data the application fetches,
    // and the corner simply stays empty here.
  },
  name: (unitNumber) => (unitNumber === 1 ? "Björnen" : "Kräftan"),
  numbers: [1, 11],
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
      <UnitIdentitiesProvider identities={identities}>
        <Story />
      </UnitIdentitiesProvider>
    </RolesProvider>
  )
}

/**
 * The contingent management, for the story that shows the color picker.
 */
export const management: readonly Role[] = [{ kind: "cmt" }]
