import { useState } from "react"

/**
 * Where the device keeps the type the reader last narrowed the waiting cases to.
 */
const chosenTypeKey = "campfire-waiting-cases-type"

/**
 * What this visit chose – the type, or empty for all of them – whatever storage made of
 * it. It lives outside the widget, which unmounts whenever the reader leaves the start
 * screen, so where a browser refuses the
 * write the choice still holds on the way back.
 */
const thisVisit = new Map<"chosen", string>()

/**
 * The type the device remembers, or this visit's choice. Guarded, because storage can
 * refuse to answer – a private window, a locked-down webview – and a refusal reads as
 * nothing stored.
 * @returns The type, or undefined for all of them.
 */
function readChosenType(): string | undefined {
  const chosen = thisVisit.get("chosen")
  if (chosen !== undefined) {
    return chosen === "" ? undefined : chosen
  }
  try {
    const stored = localStorage.getItem(chosenTypeKey)
    return stored === null || stored === "" ? undefined : stored
  } catch {
    return undefined
  }
}

/**
 * The type the reader narrowed the waiting cases to, remembered on this device so the start
 * screen keeps it from one visit to the next, and the way to choose another.
 * @returns The type, undefined for all of them, and `choose`.
 */
export function useChosenType(): {
  readonly choose: (type: string | undefined) => void
  readonly type: string | undefined
} {
  const [type, setType] = useState<string | undefined>(readChosenType)

  const choose = (next: string | undefined): void => {
    thisVisit.set("chosen", next ?? "")
    setType(next)
    try {
      localStorage.setItem(chosenTypeKey, next ?? "")
    } catch {
      // Where storage refuses, the choice holds for this visit alone.
    }
  }

  return { choose, type }
}
