import {
  formatRowMoment,
  HandIcon,
  IconButton,
  Row,
  UnitAvatar,
} from "@scouterna/wsj27-campfire-ui"
import { useUser } from "@scouterna/wsj27-campfire-utils"
import { useEffect, useRef, type ReactElement } from "react"

import {
  aboutName,
  isAboutUnit,
  lastActivity,
  scopeOf,
  unitOfCase,
  type Case,
} from "../../../model/Case"
import { scopeBadge } from "../../../model/CaseType"
import { nameOf, unitTag, type People } from "../../../model/Person"
import { standingOf } from "../../../model/Waiting"
import { useOwnUnit } from "../../use-people"
import { PersonMark } from "../personmark/PersonMark"
import { useTakeCase } from "./use-take-case"

import "./CaseRow.css"

/**
 * How long after a row appears, or the screen around it changes height, its button ignores
 * a press. A press that soon was aimed at whatever stood there before – the start screen's
 * cards arrive and grow as their reads land and push what is below them down, so a row can
 * slide in under a finger already on its way to something else, and take a case nobody
 * meant to take.
 */
const settleMs = 500

/**
 * When the screen last changed height, which is when content may have moved under a
 * finger. One observer for every row, on the screen's own landmark rather than the
 * document, because the wide layout scrolls a column inside a viewport-tall shell and the
 * document never grows there – the landmark grows with its content in every layout.
 */
const layout: {
  changedAt: number
  observer: ResizeObserver | undefined
  watched: Element | undefined
} = { changedAt: 0, observer: undefined, watched: undefined }

/**
 * Starts noting when the screen changes height, moving to the current landmark when a
 * navigation has replaced the one watched.
 */
function watchLayout(): void {
  if (typeof ResizeObserver === "undefined") {
    return
  }
  const main = document.querySelector("main")
  if (main === null || main === layout.watched) {
    return
  }
  layout.observer?.disconnect()
  layout.observer = new ResizeObserver(() => {
    layout.changedAt = performance.now()
  })
  layout.observer.observe(main)
  layout.watched = main
}

/**
 * The case, the names to show it with, and whether who it is about is shown.
 */
export interface CaseRowProps {
  /**
   * Whether the row names who the case is about. Left out on a list of one person's
   * cases, where the page already says who – except on a case about several people,
   * which names them all, so the others on it are not hidden.
   */
  readonly isAboutShown: boolean
  /**
   * The case the row opens.
   */
  readonly item: Case
  /**
   * Everyone the case can be about, undefined while the names are loading.
   */
  readonly people: People | undefined
}

/**
 * One case in any list – a doorway into it, the same row wherever it stands, because what
 * it shows follows from the case and the reader alone: its title, tagged when it is
 * private or waits for someone; who it is about and their unit, where the page does not
 * already say; what kind of case it is and who opened it; who follows it up, where that is
 * someone else; and, at its end, the way to take it on while nobody does, and when it last
 * changed. A leader's own unit is named nowhere, since every case they keep is about it.
 * The private tag stands beside the title as a funktionsansvarig's does beside a name,
 * because it is the one level a reader opening the case would not otherwise expect.
 * @param props The case, and the names to show it with.
 * @returns The row.
 */
export function CaseRow(props: CaseRowProps): ReactElement {
  const { item, people } = props
  const reader = useUser()
  const taking = useTakeCase()
  const [first] = item.aboutMemberNos
  const about = first === undefined ? undefined : people?.get(first)
  const ownUnit = useOwnUnit()
  const name = aboutName(item, people, ownUnit)
  // A unit's tag only beside one person, since several may be from several units.
  const unit = item.aboutMemberNos.length === 1 ? unitTag(about, ownUnit) : undefined
  const badge = scopeBadge(scopeOf(item), ownUnit)
  const creator = `Skapat av ${nameOf(people, item.creatorMemberNo)}`
  const unitAbout = isAboutUnit(item) ? unitOfCase(item) : undefined
  const standing = standingOf(item, new Date(), people, reader?.memberNo)
  const moment = lastActivity(item)
  // Only its creator and those it is shared with see a private case, so to its creator it
  // is theirs alone, and to anyone else it is someone else's.
  let mark: string | undefined
  if (item.secrecyLevel === 5) {
    mark = item.creatorMemberNo === reader?.memberNo ? "Bara du" : "Privat"
  }
  const isTakeable = !item.isClosed && item.assigneeMemberNo === undefined
  // Set after the row is drawn rather than while it is, so the moment is when it appeared.
  const appearedAt = useRef<number | undefined>(undefined)
  useEffect(() => {
    appearedAt.current = performance.now()
    watchLayout()
  }, [])

  return (
    <Row
      action={
        isTakeable ? (
          <IconButton
            disabled={taking.takingId !== undefined}
            hint="Jag tar det"
            icon={<HandIcon size={16} />}
            label={`Jag tar det: ${item.title}`}
            onPress={(event) => {
              // A key carries no finger that could have been on its way to something else,
              // so only a pointer's press waits for the screen to settle.
              const isKey = event.detail === 0
              const appeared = appearedAt.current
              const settled = Math.max(appeared ?? Infinity, layout.changedAt)
              if (isKey || performance.now() - settled >= settleMs) {
                taking.take(item.id)
              }
            }}
            size="small"
          />
        ) : undefined
      }
      className="case-row"
      leading={
        unitAbout === undefined ? (
          <PersonMark name={name} person={about} />
        ) : (
          <UnitAvatar unitNumber={unitAbout} />
        )
      }
      link={{ params: { caseId: item.id }, to: "/cases/$caseId" }}
      trailing={
        <time className="case-row-time" dateTime={moment.toISOString()}>
          {formatRowMoment(moment)}
        </time>
      }
    >
      <strong>
        {item.title}
        {/* A space before each tag, so a narrow row breaks the line there rather than
            pushing the tag past the column's end. */}
        {mark !== undefined && (
          <>
            {" "}
            <span className="case-row-mark">{mark}</span>
          </>
        )}
        {standing.mark !== undefined && (
          <>
            {" "}
            <span className="case-row-mark case-row-mark-waiting">{standing.mark}</span>
          </>
        )}
      </strong>
      {props.isAboutShown || item.aboutMemberNos.length > 1 ? (
        <span className="case-row-about">{unit === undefined ? name : `${name} · ${unit}`}</span>
      ) : null}
      <small>{badge === undefined ? creator : `${badge} · ${creator}`}</small>
      {standing.line !== undefined && <small>{standing.line}</small>}
      {taking.hasFailed && <small>Det gick inte att ta ärendet.</small>}
    </Row>
  )
}
