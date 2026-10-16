import type { DotMeterTone } from "@scouterna/wsj27-campfire-ui"

import type { Severity } from "../model/HealthProfile"

/**
 * The color family a grade wears wherever it is shown: danger for the top of the scale,
 * caution just under it, info for the milder grades.
 * @param severity The graded severity.
 * @returns The tone the grade and its marks wear.
 */
export function severityTone(severity: Severity): DotMeterTone {
  if (severity >= 5) {
    return "danger"
  }
  return severity === 4 ? "caution" : "info"
}
