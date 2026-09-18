import { Card, DotMeter } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { languageName, type LanguageSkill } from "../../../model/LanguageSkill"

export interface LanguagesSectionProps {
  /**
   * The graded languages, one pill each.
   */
  readonly languages: readonly LanguageSkill[]
}

/**
 * Språk: each language as a pill carrying its name and a small proficiency meter.
 * @param props The graded languages.
 * @returns The card.
 */
export function LanguagesSection(props: LanguagesSectionProps): ReactElement {
  const languages = props.languages

  return (
    <Card title="Språk">
      <div className="person-languages">
        {languages.map((skill) => (
          <span key={skill.language} className="person-language">
            {languageName(skill.language)}
            <DotMeter filled={skill.level} size="small" total={5} tone="info" />
          </span>
        ))}
      </div>
    </Card>
  )
}
