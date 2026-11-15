import { ChatIcon, type PageActionsProps } from "@scouterna/wsj27-campfire-ui"
import { hasAnyRole, useRoles } from "@scouterna/wsj27-campfire-utils"
import { useState, type ReactElement } from "react"

import { AskSheet } from "./components/asksheet/AskSheet"

/**
 * A screen's way to ask what the handbook and the FAQ do not answer.
 */
export interface AskQuestion {
  /**
   * The screen's primary action, which opens the sheet, or undefined for someone the
   * sheet's ways to ask are not for.
   */
  readonly action: NonNullable<PageActionsProps["action"]> | undefined
  /**
   * The sheet itself, to place anywhere on the screen.
   */
  readonly sheet: ReactElement | null
}

/**
 * The way to ask, for a screen of the handbook or the FAQ – offered to a unit's leaders
 * alone, because the forum it leads to is the leaders' own.
 * @param subject The subject a mail starts with, saying where the reader was.
 * @returns The action and the sheet it opens, or neither for anyone but a leader.
 */
export function useAskQuestion(subject: string): AskQuestion {
  const [isOpen, setIsOpen] = useState(false)
  const isLeader = hasAnyRole(useRoles(), "leader")
  if (!isLeader) {
    return { action: undefined, sheet: null }
  }
  return {
    action: {
      icon: <ChatIcon size={26} strokeWidth={2.2} />,
      label: "Ställ en fråga",
      onPress: () => {
        setIsOpen(true)
      },
    },
    sheet: (
      <AskSheet
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false)
        }}
        subject={subject}
      />
    ),
  }
}
