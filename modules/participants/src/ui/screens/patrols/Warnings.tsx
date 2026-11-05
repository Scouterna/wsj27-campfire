import type { ReactElement } from "react"

import "./Warnings.css"

/**
 * What the editor has to warn about.
 */
export interface WarningsProps {
  /**
   * The people whose patrol the last save could not store.
   */
  readonly failed: readonly string[]
  /**
   * Whether the last save stored anybody, so the rest can be said to be safe.
   */
  readonly isPartial: boolean
  /**
   * The names more than one patrol goes by.
   */
  readonly shared: readonly string[]
}

/**
 * The warnings over the patrols – two patrols under one name, and a save that did not
 * land for everybody. Nothing when all is well.
 * @param props What to warn about.
 * @returns The warnings.
 */
export function Warnings(props: WarningsProps): ReactElement {
  const { failed, isPartial, shared } = props
  return (
    <>
      {shared.length > 0 && (
        <p className="patrols-warning" role="alert">
          {shared.length === 1
            ? `Fler än en patrull heter ${shared.join("")}.`
            : `Flera patruller har samma namn: ${shared.join(", ")}.`}{" "}
          Ge dem olika namn innan du sparar.
        </p>
      )}
      {failed.length > 0 && (
        <p className="patrols-warning" role="alert">
          Det gick inte att spara för {failed.join(", ")}.{" "}
          {isPartial ? "Resten är sparat – försök igen." : "Försök igen."}
        </p>
      )}
    </>
  )
}
