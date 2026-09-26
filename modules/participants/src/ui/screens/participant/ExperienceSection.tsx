import { Card } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import type { Experience } from "../../../model/Experience"

export interface ExperienceSectionProps {
  /**
   * What the person has done before that the jamboree resembles.
   */
  readonly experience: Experience
}

interface FactProps {
  /**
   * The answer, and whatever was written about it.
   */
  readonly fact: { readonly details?: string; readonly has: boolean }
  /**
   * What was asked.
   */
  readonly label: string
}

/**
 * One fact: the question in quiet type, then the yes or no with the person's own words
 * quoted after it.
 * @param props What was asked, and what was answered.
 * @returns The fact.
 */
function Fact(props: FactProps): ReactElement {
  return (
    <div className="person-fact">
      <small>{props.label}</small>
      <strong>
        {props.fact.has ? "Ja" : "Nej"}
        {props.fact.details === undefined ? null : (
          <>
            {" – "}
            <q>{props.fact.details}</q>
          </>
        )}
      </strong>
    </div>
  )
}

/**
 * Erfarenhet: the yes-or-no facts, each with whatever was written about it.
 * @param props What the person has done before.
 * @returns The card.
 */
export function ExperienceSection(props: ExperienceSectionProps): ReactElement {
  const experience = props.experience

  return (
    <Card title="Erfarenhet">
      <div className="person-experience">
        {experience.internationalScouting !== undefined && (
          <Fact fact={experience.internationalScouting} label="Internationell scouting" />
        )}
        {experience.independentTravel !== undefined && (
          <Fact fact={experience.independentTravel} label="Rest självständigt utomlands" />
        )}
      </div>
    </Card>
  )
}
