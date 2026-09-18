import { PageTitle, unitsReveal, useIsRevealed, Widget } from "@scouterna/wsj27-campfire-ui"
import { leaderUnit, useRoles } from "@scouterna/wsj27-campfire-utils"
import type { ReactElement } from "react"

import { messages } from "../../../model/messages"
import { MessagesWidget } from "../../widgets/messages/MessagesWidget"
import { RevealWidget } from "../../widgets/reveal/RevealWidget"

import "./HomeScreen.css"

/**
 * The start screen: every pending reveal counting down, then the widgets the screen
 * places – a start screen earns its content a widget at a time. What goes where, who
 * sees it, and from when are this screen's own decisions; the widgets are other
 * modules', placed by id, and home never learns which module drew what (ADR 016).
 *
 * The contingent's messages are home's own, so they are imported rather than placed
 * by id. They sit over every other widget, because a word to the reader comes before
 * what they came to look up, and they wait behind the units reveal like the rest: the
 * welcome says what the reader can do here, and none of that is true before the
 * curtain opens. Which welcome is the reader's is read from the ambient roles.
 *
 * An open reveal's countdown stands down live at its moment, and what it opened takes
 * the room. The title is a static välkommen on purpose – no name (they run long) and
 * no clock – and the wording is the home feature's to revisit.
 *
 * @returns The screen.
 */
export function HomeScreen(): ReactElement {
  // Every widget waits behind the reveal that governs it – all of them behind the
  // units reveal today – and the reveal's own countdown holds the room until then.
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
