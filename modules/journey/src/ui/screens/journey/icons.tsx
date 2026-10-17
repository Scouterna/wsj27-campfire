import type { ReactElement, ReactNode } from "react"

import type { ItemKind } from "../../../model/Itinerary"

/**
 * A stroke glyph on the design system's 24-unit grid, drawn in the current color.
 * @param children The glyph's paths.
 * @returns The icon, hidden from assistive technology since the text beside it says
 *   the same.
 */
function glyph(children: ReactNode): ReactElement {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
      width="18"
    >
      {children}
    </svg>
  )
}

const glyphs: Readonly<Record<ItemKind, ReactElement>> = {
  activity: glyph(
    <>
      <path d="M5.5 20.5v-16" />
      <path d="M5.5 4.5h11l-2.2 4 2.2 4h-11" />
    </>,
  ),
  gathering: glyph(
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.6 14.1a4.6 4.6 0 0 1 5.2 4.6" />
    </>,
  ),
  meal: glyph(
    <>
      <path d="M7 3.5v17" />
      <path d="M4.5 3.5v4.5a2.5 2.5 0 0 0 5 0V3.5" />
      <path d="M17.5 20.5v-17c-2.2 1.1-3.3 4-3.3 7.5h3.3" />
    </>,
  ),
  overnight: glyph(<path d="M19.5 14.6A7.9 7.9 0 1 1 9.4 4.5a6.3 6.3 0 0 0 10.1 10.1Z" />),
  travel: glyph(
    <>
      <path d="M6 17.5v-11a2.5 2.5 0 0 1 2.5-2.5h7A2.5 2.5 0 0 1 18 6.5v11" />
      <path d="M6 11.5h12" />
      <path d="M4.5 17.5h15" />
      <path d="M8 17.5v2.5M16 17.5v2.5" />
      <path d="M9 14.5h.01M15 14.5h.01" />
    </>,
  ),
}

/**
 * The glyph for a kind of item.
 * @param kind The item's kind.
 * @returns The icon.
 */
export function kindIcon(kind: ItemKind): ReactElement {
  // eslint-disable-next-line security/detect-object-injection -- kind is a closed union
  return glyphs[kind]
}

/**
 * A chevron, pointing down while what it opens is closed.
 * @returns The icon.
 */
export function chevronIcon(): ReactElement {
  return glyph(<path d="m7 10 5 5 5-5" />)
}
