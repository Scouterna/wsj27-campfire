import { useState } from "react"

import { closedMessagesKey, parseClosedMessages } from "../../../model/messages"

/**
 * What was closed during this visit, whatever storage made of it. The widget unmounts
 * whenever the reader leaves the start screen, so its own state cannot hold this: a
 * browser that refuses the write would otherwise show a closed message again the
 * moment they came back.
 */
const closedThisVisit = new Set<string>()

/**
 * What this device has closed: what storage holds, and what this visit closed. Guarded,
 * because storage can refuse to answer – a private window, a locked-down webview – and
 * a refusal reads as nothing stored rather than a crash.
 * @returns The closed ids.
 */
function readClosedMessages(): ReadonlySet<string> {
  try {
    const stored = parseClosedMessages(localStorage.getItem(closedMessagesKey) ?? undefined)
    return stored.union(closedThisVisit)
  } catch {
    return new Set(closedThisVisit)
  }
}

/**
 * Forgets everything this device has closed, in storage and in this visit alike. The
 * catalog's reset: its canvas is one long visit on one device, so without it a story
 * closed once would stay empty.
 */
export function forgetClosedMessages(): void {
  closedThisVisit.clear()
  try {
    localStorage.removeItem(closedMessagesKey)
  } catch {
    // Nothing stored to forget where storage refuses.
  }
}

/**
 * The messages this device has closed, and the way to close more.
 * @returns The closed ids, and `close`, which adds to them for this visit and – where
 * storage takes the write – for every visit after it.
 */
export function useClosedMessages(): {
  readonly close: (ids: readonly string[]) => void
  readonly closed: ReadonlySet<string>
} {
  const [closed, setClosed] = useState<ReadonlySet<string>>(readClosedMessages)

  const close = (ids: readonly string[]): void => {
    for (const id of ids) {
      closedThisVisit.add(id)
    }
    // Read again rather than trusting what this mount read: another tab on the same
    // device may have closed something since, and writing an older set back would
    // open it again. A union, never a replacement – an id the list no longer holds
    // stays remembered too.
    const next = readClosedMessages()
    setClosed(next)
    try {
      localStorage.setItem(closedMessagesKey, JSON.stringify([...next]))
    } catch {
      // Refused storage: closed for this visit, and back on the next.
    }
  }

  return { close, closed }
}
