import { HealthIcon, LeafIcon } from "@scouterna/wsj27-campfire-ui"
import { Link } from "@tanstack/react-router"
import { useId, useState, type ReactElement } from "react"

import { careNeedName, type Care, type CareNeed } from "../../../model/Care"
import { fullName } from "../../../model/Participant"
import type { ParticipantDetail } from "../../../model/ParticipantDetail"
import { DietSection } from "../participant/DietSection"
import { HealthSection } from "../participant/HealthSection"

// The sections are the person page's own, and so are the styles they are drawn with.
import "../participant/ParticipantScreen.css"

/**
 * Which of the two glyphs a person's needs call for: the leaf for what they can and
 * cannot eat, and the heart for their health and whatever they asked the leaders to know.
 * Two rather than one per need, so a chip never carries a row of them.
 * @param care What the person needs.
 * @returns Whether each glyph is drawn, and the leaf's tone.
 */
function glyphsFor(care: Care): {
  readonly food?: "allergy" | "diet" | "serious"
  readonly isHealth: boolean
} {
  const hasNeed = (need: CareNeed): boolean => care.needs.includes(need)
  let food: "allergy" | "diet" | "serious" = "diet"
  if (care.isSerious === true) {
    food = "serious"
  } else if (hasNeed("allergy")) {
    food = "allergy"
  }
  return {
    isHealth: hasNeed("health") || hasNeed("support"),
    ...((hasNeed("allergy") || hasNeed("diet")) && { food }),
  }
}

/**
 * The person whose care a `PatrolCare` shows, and what it comes to.
 */
export interface PatrolCareProps {
  /**
   * What they need, at a glance.
   */
  readonly care: Care
  /**
   * Their record in full, which the popover draws its sections from.
   */
  readonly person: ParticipantDetail
}

/**
 * A person's care needs on their chip – a leaf for food and allergies, red where an
 * allergy is serious, and a heart for health – that opens their diet, allergies, and
 * health over the patrols, so a leader reads them
 * without leaving the arrangement they are in the middle of. The popover is the
 * platform's own, which puts it above everything and closes it on Escape or a press
 * outside it.
 *
 * Marked as no place to start a drag, because the popover is the chip's child in the
 * document, and a press inside it would otherwise pick the chip up.
 * @param props The person, and their care.
 * @returns The button and its popover.
 */
export function PatrolCare(props: PatrolCareProps): ReactElement {
  const { care, person } = props
  const id = useId()
  // The sections are drawn only while the popover is open, because their headings would
  // otherwise join the page outline once for every person with a need.
  const [isOpen, setOpen] = useState(false)
  const named = care.needs.map((need) => careNeedName(need)).join(", ")
  const glyphs = glyphsFor(care)

  return (
    <span className="patrol-care" data-no-drag="">
      <button
        aria-label={`Hälsa och kost för ${fullName(person)}: ${named}`}
        className="patrol-care-button"
        popoverTarget={id}
        title={named}
        type="button"
      >
        {glyphs.food === undefined ? null : (
          <span className={`patrol-care-glyph patrol-care-${glyphs.food}`}>
            <LeafIcon size={17} strokeWidth={2.1} />
          </span>
        )}
        {glyphs.isHealth && (
          <span className="patrol-care-glyph">
            <HealthIcon size={17} strokeWidth={2.1} />
          </span>
        )}
      </button>
      <div
        aria-label={`${fullName(person)} – hälsa och kost`}
        className="patrol-care-popover"
        id={id}
        onToggle={(event) => {
          setOpen(event.newState === "open")
        }}
        popover="auto"
        role="dialog"
      >
        <div className="patrol-care-heading">
          <strong>{fullName(person)}</strong>
          <button
            className="patrol-care-close"
            popoverTarget={id}
            popoverTargetAction="hide"
            type="button"
          >
            Stäng
          </button>
        </div>
        {isOpen && person.health !== undefined && <DietSection health={person.health} />}
        {isOpen && <HealthSection health={person.health} notes={person.notes} />}
        <Link
          className="patrol-care-link"
          params={{ memberNo: person.memberNo }}
          to="/participants/$memberNo"
        >
          Visa allt om {person.firstName}
        </Link>
      </div>
    </span>
  )
}
