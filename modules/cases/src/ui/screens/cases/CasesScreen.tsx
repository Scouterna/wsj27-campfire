import {
  Button,
  Card,
  PageActions,
  PageTitle,
  PlusIcon,
  SearchField,
  SegmentedControl,
} from "@scouterna/wsj27-campfire-ui"
import { useUser } from "@scouterna/wsj27-campfire-utils"
import { useState, type ReactElement } from "react"

import { aboutName, type Case } from "../../../model/Case"
import { nameOf, type People } from "../../../model/Person"
import { CaseList } from "../../components/caselist/CaseList"
import { casesSectionLabel } from "../../section-label"
import { useCases } from "./use-cases"

import "./CasesScreen.css"

/**
 * The narrowings the filter offers: the cases the reader opened, every open case, and the
 * closed ones.
 */
type Filter = "closed" | "mine" | "open"

/**
 * The filters, in the order they stand, with the words on each segment.
 */
const filters: readonly (readonly [Filter, string])[] = [
  ["mine", "Mina"],
  ["open", "Öppna"],
  ["closed", "Avslutade"],
]

/**
 * Whether a case holds the search – in who it is about, its title, or who opened it.
 * @param item The case to test.
 * @param people Everyone the module knows, undefined while the names are loading.
 * @param needle What the reader typed, trimmed and lower-cased.
 * @returns True when the case matches, and for every case while nothing is typed.
 */
function isMatch(item: Case, people: People | undefined, needle: string): boolean {
  if (needle === "") {
    return true
  }
  const haystack = [aboutName(item, people), item.title, nameOf(people, item.creatorMemberNo)]
  return haystack.join(" ").toLocaleLowerCase("sv").includes(needle)
}

/**
 * The section root: the health team's cases, narrowed to the reader's own, the open
 * ones, or the closed ones, and searched over names and titles – the open cases on one
 * card and the closed ones on another, each newest first.
 * @returns The screen.
 */
export function CasesScreen(): ReactElement {
  const user = useUser()
  const [filter, setFilter] = useState<Filter>("open")
  const [query, setQuery] = useState("")
  const { cases, error, isPending, people, refetch } = useCases()

  const needle = query.trim().toLocaleLowerCase("sv")
  const shown = cases.filter(
    (item) =>
      (filter !== "mine" || item.creatorMemberNo === user?.memberNo) &&
      isMatch(item, people, needle),
  )
  const open = filter === "closed" ? [] : shown.filter((item) => !item.isClosed)
  const closed = filter === "open" ? [] : shown.filter((item) => item.isClosed)
  const isEmpty = !isPending && error === null && open.length === 0 && closed.length === 0

  return (
    <>
      <PageTitle title={casesSectionLabel} />
      <PageActions
        action={{
          icon: <PlusIcon size={26} strokeWidth={2.2} />,
          label: "Nytt ärende",
          link: { to: "/cases/new" },
        }}
      />

      <SearchField
        label="Sök ärenden"
        onChange={(event) => {
          setQuery(event.target.value)
        }}
        placeholder="Sök ärenden"
        value={query}
      />

      <SegmentedControl
        current={Math.max(
          0,
          filters.findIndex(([value]) => value === filter),
        )}
        entries={filters.map(([, words]) => words)}
        label="Filtrera ärenden"
        onPick={(index) => {
          setFilter(filters.at(index)?.[0] ?? "open")
        }}
      />

      {isPending && (
        <p className="cases-status" role="status">
          Hämtar ärendena …
        </p>
      )}

      {!isPending && error !== null && (
        <>
          <p className="cases-status" role="alert">
            Ärendena kunde inte hämtas.
          </p>
          <Button label="Försök igen" onPress={refetch} />
        </>
      )}

      {open.length > 0 && <CaseList cases={open} people={people} title="Öppna ärenden" />}
      {closed.length > 0 && <CaseList cases={closed} people={people} title="Avslutade" />}

      {isEmpty && (
        <Card>
          <p className="cases-empty">
            {needle === "" ? emptyWords(filter) : "Inga ärenden matchar sökningen."}
          </p>
        </Card>
      )}
    </>
  )
}

/**
 * What the screen says when a filter holds nothing.
 * @param filter The narrowing in force.
 * @returns The sentence.
 */
function emptyWords(filter: Filter): string {
  if (filter === "mine") {
    return "Du har inte skapat några ärenden."
  }
  return filter === "open" ? "Inga öppna ärenden." : "Inga avslutade ärenden."
}
