import { PictureOffIcon, unitsReveal, useIsRevealed } from "@scouterna/wsj27-campfire-ui"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Fragment, type ReactElement } from "react"

import { fetchParticipantsQuery } from "../../../data/fetch-participants"
import { useViewer } from "../../../data/viewer"
import { fullName } from "../../../model/Participant"
import { withheldPictures } from "../../../model/pictures"

import "./WithheldPictures.css"

/**
 * Which unit a `WithheldPictures` names the people of.
 */
export interface WithheldPicturesProps {
  /**
   * The unit, by number.
   */
  readonly unitNumber: number
}

/**
 * The people of one unit who said no to pictures of them being published, named and each
 * a way into their page, for whoever is about to publish one for the unit. It reads the
 * list the reader already has, so it names only the people the reader may see, and it
 * draws nothing where nobody among them said no, nor while the list is on its way or could
 * not be read – silence here is no promise that everybody agreed. Nothing is named before
 * the units reveal opens, because until then the people are not offered anywhere.
 * @param props The unit.
 * @returns The names under their title, or nothing.
 */
export function WithheldPictures(props: WithheldPicturesProps): ReactElement | null {
  const viewer = useViewer()
  const isRevealed = useIsRevealed(unitsReveal.id)
  const query = fetchParticipantsQuery(viewer)
  const { data } = useQuery({ ...query, enabled: isRevealed && viewer.memberNo !== "" })
  const people = data === undefined ? [] : withheldPictures(data.people, props.unitNumber)

  if (!isRevealed || people.length === 0) {
    return null
  }
  return (
    <div className="withheld-pictures">
      <p className="withheld-pictures-title">
        <span aria-hidden="true">
          <PictureOffIcon />
        </span>
        Bilder får inte publiceras på
      </p>
      <p className="withheld-pictures-names">
        {people.map((person, index) => (
          <Fragment key={person.memberNo}>
            {index === 0 ? null : ", "}
            <Link params={{ memberNo: person.memberNo }} to="/participants/$memberNo">
              {fullName(person)}
            </Link>
          </Fragment>
        ))}
      </p>
    </div>
  )
}
