import type { ReactElement, ReactNode } from "react"

import { CaseCare } from "./case-care"
import { ParticipantMenus } from "./participant-menus"
import { PicturesWithheld } from "./withheld-pictures"

/**
 * What `ModuleSeams` wraps.
 */
export interface ModuleSeamsProps {
  /**
   * The subtree whose screens draw what one module hands another.
   */
  readonly children: ReactNode
}

/**
 * Every place one module's screens draw what another module knows, mounted together
 * under the section grants, which the menus' entries are offered by.
 * @param props The subtree that shows them.
 * @returns The subtree, with every seam in scope.
 */
export function ModuleSeams(props: ModuleSeamsProps): ReactElement {
  return (
    <ParticipantMenus>
      <CaseCare>
        <PicturesWithheld>{props.children}</PicturesWithheld>
      </CaseCare>
    </ParticipantMenus>
  )
}
