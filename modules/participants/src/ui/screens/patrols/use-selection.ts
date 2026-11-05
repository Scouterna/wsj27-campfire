import { useCallback, useEffect, useState } from "react"

/**
 * The people picked to move together, and the ways of changing who they are.
 */
export interface Selection {
  /**
   * Lets everybody go.
   */
  readonly clear: () => void
  /**
   * Picks exactly these people, letting anybody else go.
   */
  readonly pick: (memberNos: Iterable<string>) => void
  /**
   * The member numbers picked.
   */
  readonly picked: ReadonlySet<string>
  /**
   * Picks a person, or lets them go when they are already picked.
   */
  readonly toggle: (memberNo: string) => void
}

/**
 * Who is picked to move together. Escape lets everybody go, as it leaves a selection
 * anywhere else, unless a modal is open, since the Escape is then theirs and the browser
 * closes it without saying so on the event.
 * @returns The picked, and the ways of changing them.
 */
export function useSelection(): Selection {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    if (picked.size === 0) {
      return
    }
    const onKey = (event: KeyboardEvent): void => {
      const isOverlaid = document.querySelector(":modal") !== null
      if (event.key === "Escape" && !event.defaultPrevented && !isOverlaid) {
        setPicked(new Set())
      }
    }
    addEventListener("keydown", onKey)
    return () => {
      removeEventListener("keydown", onKey)
    }
  }, [picked])

  // Stable, because the page's menu is built on it and the chrome republishes that menu.
  const pick = useCallback((memberNos: Iterable<string>): void => {
    setPicked(new Set(memberNos))
  }, [])

  return {
    clear: () => {
      setPicked(new Set())
    },
    pick,
    picked,
    toggle: (memberNo) => {
      setPicked((current) => {
        const next = new Set(current)
        if (!next.delete(memberNo)) {
          next.add(memberNo)
        }
        return next
      })
    },
  }
}
