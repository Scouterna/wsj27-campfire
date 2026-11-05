import { HealthIcon, LeafIcon } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import type { Care, CareNeed } from "../../../model/Care"

import "./CareButton.css"

/**
 * Which of the two glyphs a person's needs call for: the leaf for what they can and
 * cannot eat, and the heart for their health. Two rather than one per need, so a row
 * never carries a line of them, and neither says how serious it is, because that is the
 * sheet's to tell.
 * @param care What the person needs.
 * @returns Whether each glyph is drawn.
 */
function glyphsFor(care: Care): { readonly isFood: boolean; readonly isHealth: boolean } {
  const hasNeed = (need: CareNeed): boolean => care.needs.includes(need)
  return {
    isFood: hasNeed("allergy") || hasNeed("diet"),
    isHealth: hasNeed("health"),
  }
}

/**
 * What a need reads as in a sentence about the person.
 * @param need The need.
 * @param isSerious Whether their allergy is serious.
 * @returns The phrase.
 */
function needPhrase(need: CareNeed, isSerious: boolean): string {
  switch (need) {
    case "allergy": {
      return isSerious ? "en allvarlig allergi" : "en allergi"
    }
    case "diet": {
      return "specialkost"
    }
    case "health": {
      return "något att tänka på för hälsan"
    }
  }
}

/**
 * A sentence saying what the person has and what pressing shows – "Ester Dahl har en
 * allvarlig allergi och specialkost. Visa hälsa och kost." – because the glyphs alone say
 * neither. It is both the tooltip and the button's name, so a screen reader reads it once.
 * @param name Whose care it is.
 * @param care What the person needs.
 * @returns The sentence.
 */
function hintFor(name: string, care: Care): string {
  const phrases = care.needs.map((need) => needPhrase(need, care.isSerious === true))
  const last = phrases.at(-1) ?? ""
  const listed = phrases.length > 1 ? `${phrases.slice(0, -1).join(", ")} och ${last}` : last
  return `${name} har ${listed}. Visa hälsa och kost.`
}

/**
 * What a `CareButton` marks, and what pressing it does.
 */
export interface CareButtonProps {
  /**
   * What the person needs.
   */
  readonly care: Care
  /**
   * Whose care it is, by their full name.
   */
  readonly name: string
  /**
   * Opens the person's care.
   */
  readonly onPress: () => void
}

/**
 * A person's needs at a glance – a leaf for food and allergies and a heart for health – as
 * a small button that opens them. It owns no sheet, so a list can keep the one sheet in
 * something that outlives its rows.
 * @param props The needs, whose they are, and what pressing does.
 * @returns The button.
 */
export function CareButton(props: CareButtonProps): ReactElement {
  const hint = hintFor(props.name, props.care)
  const glyphs = glyphsFor(props.care)
  return (
    <button
      aria-label={hint}
      className="care-button"
      onClick={props.onPress}
      title={hint}
      type="button"
    >
      {glyphs.isFood && <LeafIcon size={16} />}
      {glyphs.isHealth && <HealthIcon size={16} />}
    </button>
  )
}
