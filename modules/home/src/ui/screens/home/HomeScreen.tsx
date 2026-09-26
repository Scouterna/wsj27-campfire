import { PageTitle, unitsReveal, useIsRevealed, Widget } from "@scouterna/wsj27-campfire-ui"
import { leaderUnit, useRoles } from "@scouterna/wsj27-campfire-utils"
import type { ReactElement } from "react"

import { messages } from "../../../model/messages"
import { MessagesWidget } from "../../widgets/messages/MessagesWidget"
import { RevealWidget } from "../../widgets/reveal/RevealWidget"

import "./HomeScreen.css"

/**
 * The start screen – the units reveal counting down, then the widgets the screen
 * places. What goes where, who sees it, and from when are this screen's own decisions,
 * while the widgets are other modules', placed by id, so home never learns which module
 * drew what (ADR 016).
 *
 * The contingent's messages are home's own, so they are imported rather than placed
 * by id. They sit over every other widget, because a word to the reader comes before
 * what they came to look up. They wait behind the units reveal like every other widget,
 * because the welcome says what the reader can do here and none of that is true before
 * the curtain opens.
 *
 * The title is a static välkommen on purpose – no name, because names run long, and no
 * clock.
 *
 * @returns The screen.
 */
export function HomeScreen(): ReactElement {
  const isUnitsRevealed = useIsRevealed(unitsReveal.id)
  const roles = useRoles()
  const isLeader = leaderUnit(roles) !== undefined

  return (
    <>
      <PageTitle title="Välkommen" />
      <div className="home">
        <RevealWidget reveal={unitsReveal} />
        {isUnitsRevealed && <MessagesWidget messages={messages} roles={roles} />}
        {isUnitsRevealed && <Widget id="journey:countdown" />}
        {isUnitsRevealed && isLeader && <Widget id="participants:unit" />}
      </div>
    </>
  )
}
