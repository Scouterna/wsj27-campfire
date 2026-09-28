import {
  GenderFemaleIcon,
  GenderMaleIcon,
  GenderOtherIcon,
  type IconProps,
} from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { genderName, type Gender } from "../../../model/Gender"

import "./GenderMark.css"

/**
 * The gender a `GenderMark` draws.
 */
export interface GenderMarkProps {
  /**
   * The gender to draw.
   */
  readonly gender: Gender
}

// Okänt has no sign, because anything standing in for one – a dash – reads as a minus on
// the age beside it. The person's page says it in words instead.
const icons: Readonly<Record<Exclude<Gender, "okant">, (props: IconProps) => ReactElement>> = {
  annat: GenderOtherIcon,
  kvinna: GenderFemaleIcon,
  man: GenderMaleIcon,
}

/**
 * A person's gender as a quiet grey sign, which a screen reader reads as the
 * registration's own word.
 * @param props The gender to draw.
 * @returns The sign, or nothing for a gender Scoutnet records as unknown.
 */
export function GenderMark(props: GenderMarkProps): ReactElement | null {
  if (props.gender === "okant") {
    return null
  }
  const Icon = icons[props.gender]
  return (
    <span aria-label={genderName(props.gender)} className="gender-mark" role="img">
      <Icon />
    </span>
  )
}
