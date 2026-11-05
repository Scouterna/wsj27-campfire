import { ConfirmDialog } from "@scouterna/wsj27-campfire-ui"
import { useBlocker } from "@tanstack/react-router"
import type { ReactElement } from "react"

/**
 * Whether there is anything to lose by leaving.
 */
export interface LeaveGuardProps {
  /**
   * Whether the draft holds changes not yet stored, which holds through a save until the
   * service has answered.
   */
  readonly isUnsaved: boolean
}

/**
 * Asks before a navigation takes the leader away from changes only this screen holds, so
 * the way into a person is as safe to press as any other. The browser's own unload prompt
 * stays off, because a native shell has nothing to draw it with.
 * @param props Whether there are changes to lose.
 * @returns The question, while there is one.
 */
export function LeaveGuard(props: LeaveGuardProps): ReactElement {
  const { isUnsaved } = props
  const leaving = useBlocker({
    enableBeforeUnload: false,
    shouldBlockFn: () => isUnsaved,
    withResolver: true,
  })
  return (
    <ConfirmDialog
      confirmLabel="Lämna"
      description="Ändringarna i patrullerna är inte sparade och försvinner om du går härifrån."
      isOpen={leaving.status === "blocked"}
      onCancel={() => {
        leaving.reset?.()
      }}
      onConfirm={() => {
        leaving.proceed?.()
      }}
      title="Lämna utan att spara?"
    />
  )
}
