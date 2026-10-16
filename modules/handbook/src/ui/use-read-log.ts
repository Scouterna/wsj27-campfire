import { useEffect, useState } from "react"

// This browser's memory of when it last showed each chapter, for telling a reader what
// changed since. A convenience only – without storage every chapter reads as never
// opened, and the handbook falls back to showing what is fresh.
const storageKey = "campfire-handbook-read"

/**
 * When this browser last showed each chapter, by the chapter's id.
 * @returns The moments, as ISO 8601 instants, or none when storage is unavailable.
 */
function readLog(): Readonly<Record<string, string>> {
  try {
    const raw = localStorage.getItem(storageKey)
    const parsed: unknown = raw === null ? {} : JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {}
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    )
  } catch {
    return {}
  }
}

/**
 * When this browser last showed each chapter, as it stood when the screen mounted.
 * @returns A lookup by chapter id, answering undefined for a chapter never shown.
 */
export function useReadLog(): (chapterId: number) => string | undefined {
  const [log] = useState(readLog)
  return (chapterId) => log[String(chapterId)]
}

/**
 * When this browser last showed a chapter before now, and a note that it is showing it
 * now. The answer is the one from before this visit, so what changed stays marked for
 * as long as the reader is on the chapter.
 * @param chapterId The chapter on screen, or undefined while it is not known yet.
 * @returns When the chapter was last shown, or undefined when it never was.
 */
export function useLastRead(chapterId: number | undefined): string | undefined {
  const [log] = useState(readLog)

  useEffect(() => {
    if (chapterId === undefined) {
      return
    }
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ ...readLog(), [String(chapterId)]: new Date().toISOString() }),
      )
    } catch {
      // Storage refused, so the next visit reads as a first one – the fallback the
      // handbook already has.
    }
  }, [chapterId])

  return chapterId === undefined ? undefined : log[String(chapterId)]
}
