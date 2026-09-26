import {
  Button,
  Card,
  cmtAvatarNumber,
  istAvatarNumber,
  PageTitle,
  Row,
  UnitAvatar,
  useUnitIdentities,
} from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { counted, personCount } from "../../counted"
import { useUnitEntries } from "./use-unit-entries"

import "./UnitsScreen.css"

/**
 * The number behind an entry's mark: a unit's own, or the one the IST or the management
 * wears.
 * @param key The entry's key.
 * @returns The number whose mark the entry wears.
 */
function avatarNumberOf(key: string): number {
  if (key === "ist") {
    return istAvatarNumber
  }
  return key === "cmt" ? cmtAvatarNumber : Number(key)
}

/**
 * The unit browser: every unit the viewer may read, then the IST and the contingent
 * management, each with how many people it holds.
 *
 * Derived from the list the section already fetched rather than asked for separately, so
 * opening the browser costs nothing – and short enough to read whole, so the rows are
 * plain ones rather than a virtual list.
 * @returns The screen.
 */
export function UnitsScreen(): ReactElement {
  const { entries, error, isPending, refetch } = useUnitEntries()
  const identities = useUnitIdentities()

  if (isPending) {
    return (
      <>
        <PageTitle title="Avdelningar" />
        <p className="units-status" role="status">
          Hämtar deltagarna …
        </p>
      </>
    )
  }

  if (error !== null) {
    return (
      <>
        <PageTitle title="Avdelningar" />
        <p className="units-status" role="status">
          Deltagarna kunde inte hämtas.
        </p>
        <Button label="Försök igen" onPress={refetch} />
      </>
    )
  }

  // The entry's name leads the subtitle where the identities know one, and the IST and the
  // management have identities of their own, like any unit.
  const subtitleOf = (key: string, count: number): string => {
    const people = personCount(count)
    const name = identities.name(avatarNumberOf(key))
    return name === undefined ? people : `${name} · ${people}`
  }

  return (
    <>
      <PageTitle title="Avdelningar" />
      {entries.length === 0 ? (
        <p className="units-status" role="status">
          Ingen att visa.
        </p>
      ) : (
        <Card aside={<span aria-hidden="true">{counted(entries.length)}</span>} title="Alla">
          {entries.map((entry) => (
            <Row
              key={entry.key}
              leading={<UnitAvatar unitNumber={avatarNumberOf(entry.key)} />}
              link={{ params: { unit: entry.key }, to: "/participants/units/$unit" }}
            >
              <strong>{entry.label}</strong>
              <small>{subtitleOf(entry.key, entry.count)}</small>
            </Row>
          ))}
        </Card>
      )}
    </>
  )
}
