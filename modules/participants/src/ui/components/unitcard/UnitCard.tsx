import {
  Card,
  Row,
  ThemeScope,
  UnitAvatar,
  unitTheme,
  useUnitIdentities,
  type Theme,
} from "@scouterna/wsj27-campfire-ui"
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react"

import type { Participant } from "../../../model/Participant"
import { useFullScreen } from "./use-full-screen"

import "./UnitCard.css"

// Split off, because the map library, its worker, and the postorter are several hundred
// kilobytes, and only a unit's card ever draws them. Nothing outside the map's own
// directory may import the library, or it lands in every screen's bundle. A chunk that
// cannot be fetched – a first install made offline, or a deploy that removed it – is a
// card without a map for the rest of the session rather than an error, which Suspense
// alone would let take down the whole screen.
const UnitPlaces = lazy(async () => {
  try {
    return await import("./map/UnitPlaces")
  } catch {
    return { default: (): null => null }
  }
})

export interface UnitCardProps {
  /**
   * What the card says under the identity – a list still loading, or one that failed.
   */
  readonly children?: ReactNode
  /**
   * What the folded card says it opens – "Se var ni bor" on the unit's own leader's home
   * screen, and words without "ni" for anybody else.
   */
  readonly openLabel: string
  /**
   * The unit's people, whose home towns the map shows.
   */
  readonly people: readonly Participant[]
  /**
   * The card's heading. None where the page's own title already names the unit.
   */
  readonly title?: string
  /**
   * The unit the card is about.
   */
  readonly unitNumber: number
  /**
   * The theme of whoever is looking, which the card wears where it is not the unit's own
   * – the management's, when the management is looking. The unit's theme when unsaid.
   */
  readonly viewerTheme?: Theme
}

/**
 * One unit's identity – its mark, its number, and its name once one is public – over a
 * map of where its people live, which opens up to the map in full, and from there to the
 * whole screen. The card wears the theme of whoever is looking – the unit's own for its
 * leaders, and the management's for the management.
 *
 * @param props The unit, its people, the heading, and what the card has to say.
 * @returns The card.
 */
export function UnitCard(props: UnitCardProps): ReactElement {
  const identities = useUnitIdentities()
  const [isMapOpen, setIsMapOpen] = useState(false)
  const identityRef = useRef<HTMLDivElement>(null)
  const fullScreen = useFullScreen(identityRef)
  // Keyed on the towns themselves rather than on the list, so a payload that changes
  // something else about the people keeps the map, and the reader's place in it, as it
  // is. Joined on a separator no typed town holds.
  const homeTownsKey = props.people.map((person) => person.homeTown ?? "").join("\u{1F}")
  const homeTowns = useMemo(
    () => homeTownsKey.split("\u{1F}").map((town) => (town === "" ? undefined : town)),
    [homeTownsKey],
  )
  // A unit nobody's home town is known for has nothing to draw, which is known here
  // without loading the map to learn it.
  const hasHomeTowns = homeTowns.some((town) => town !== undefined)
  const name = identities.name(props.unitNumber)
  const theme = props.viewerTheme ?? unitTheme(props.unitNumber)

  // The map is unmounted here, and the control that leaves full screen with it, so full
  // screen ends with the map rather than leaving no way out.
  const { isFullScreen, toggle } = fullScreen
  useEffect(() => {
    if (!hasHomeTowns && isFullScreen) {
      toggle()
    }
  }, [hasHomeTowns, isFullScreen, toggle])

  return (
    <ThemeScope theme={theme}>
      <Card {...(props.title !== undefined && { title: props.title })}>
        {/* A popover only so it can be lifted into the top layer to fill the screen,
            without leaving its place in the tree and rebuilding the map. */}
        <div className="unit-card-identity" popover="manual" ref={identityRef}>
          {hasHomeTowns && (
            <Suspense fallback={null}>
              <UnitPlaces
                homeTowns={homeTowns}
                isFullScreen={fullScreen.isFullScreen}
                isOpen={isMapOpen}
                onFullScreenToggle={fullScreen.toggle}
                onToggle={() => {
                  setIsMapOpen((open) => !open)
                }}
                openLabel={props.openLabel}
              />
            </Suspense>
          )}
          <Row leading={<UnitAvatar size="profile" unitNumber={props.unitNumber} />}>
            {name === undefined ? (
              <strong>Avdelning {props.unitNumber}</strong>
            ) : (
              <>
                <strong>{name}</strong>
                <small>Avdelning {props.unitNumber}</small>
              </>
            )}
          </Row>
        </div>
        {props.children}
      </Card>
    </ThemeScope>
  )
}
