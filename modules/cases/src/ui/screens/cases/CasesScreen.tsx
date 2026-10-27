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
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { useState, type ReactElement } from "react"

import { aboutName, byLastActivity, type Case } from "../../../model/Case"
import { nameOf, type People } from "../../../model/Person"
import { isWaiting } from "../../../model/Waiting"
import { CaseList } from "../../components/caselist/CaseList"
import { casesSectionLabel } from "../../section-label"
import { useCasesAccess } from "../../use-cases-access"
import { useOwnUnit } from "../../use-people"
import { toCasesSearch, type CasesList } from "./search"
import { useCases } from "./use-cases"

import "./CasesScreen.css"

/**
 * A narrowing the filter offers, and its words: what its segment is called, and what the
 * screen says when it holds nothing. The reader's own cases cut across the others, which
 * sort the open cases by whether they wait for someone and set the closed ones apart.
 */
interface Filter {
  readonly empty: string
  readonly segment: string
  readonly value: CasesList | "mine"
}

/**
 * The reader's own cases, which the screen opens on, since those are theirs to act on.
 */
const mine: Filter = { empty: "Du har inga öppna ärenden.", segment: "Mina", value: "mine" }

/**
 * The filters, in the order they stand.
 */
const filters: readonly Filter[] = [
  mine,
  { empty: "Inga ärenden väntar.", segment: "Väntar", value: "waiting" },
  { empty: "Inga ärenden pågår.", segment: "Pågår", value: "moving" },
  { empty: "Inga avslutade ärenden.", segment: "Avslutade", value: "closed" },
]

/**
 * One list on the screen, under its heading.
 */
interface Listing {
  readonly cases: readonly Case[]
  readonly title: string
}

/**
 * The lists a filter shows, each with its heading. The reader's own are two – those they
 * follow up, then those they opened that someone else or nobody does – so a case they
 * both opened and follow up is listed once, among the first.
 * @param filter The narrowing in force.
 * @param cases Every case the reader reaches.
 * @param at The moment that decides which cases wait.
 * @param readerMemberNo The reader's own member number.
 * @returns The lists, some of them empty.
 */
function listingsOf(
  filter: Filter,
  cases: readonly Case[],
  at: Date,
  readerMemberNo: string | undefined,
): readonly Listing[] {
  const open = cases.filter((item) => !item.isClosed)
  switch (filter.value) {
    case "closed": {
      return [{ cases: cases.filter((item) => item.isClosed), title: "Avslutade" }]
    }
    case "mine": {
      // Nobody's own without a reader, since a case nobody follows up would otherwise
      // match a reader who is nobody.
      if (readerMemberNo === undefined) {
        return []
      }
      const followed = open.filter((item) => item.assigneeMemberNo === readerMemberNo)
      const created = open.filter(
        (item) =>
          item.creatorMemberNo === readerMemberNo && item.assigneeMemberNo !== readerMemberNo,
      )
      return [
        { cases: followed, title: "Du är ansvarig" },
        { cases: created, title: "Du har skapat" },
      ]
    }
    case "moving": {
      return [{ cases: open.filter((item) => !isWaiting(item, at)), title: "Pågår" }]
    }
    case "waiting": {
      return [{ cases: open.filter((item) => isWaiting(item, at)), title: "Väntar" }]
    }
  }
}

/**
 * Whether a case holds the search – in anyone it is about, its title, or who opened it.
 * @param item The case to test.
 * @param people Everyone the module knows, undefined while the names are loading.
 * @param needle What the reader typed, trimmed and lower-cased.
 * @param ownUnit The one unit the reader leads, named as the row names it.
 * @returns True when the case matches, and for every case while nothing is typed.
 */
function isMatch(
  item: Case,
  people: People | undefined,
  needle: string,
  ownUnit: number | undefined,
): boolean {
  if (needle === "") {
    return true
  }
  // The short line names only the first of several people, so each is searched by name.
  const haystack = [
    aboutName(item, people, ownUnit),
    ...item.aboutMemberNos.map((memberNo) => nameOf(people, memberNo)),
    item.title,
    nameOf(people, item.creatorMemberNo),
  ]
  return haystack.join(" ").toLocaleLowerCase("sv").includes(needle)
}

/**
 * The section root: the cases the reader's roles reach – their own, those that wait for
 * someone, those under way, or the closed ones – searched over names and titles, the
 * latest change first. It opens on the reader's own, the ones they have to act on.
 * @returns The screen.
 */
export function CasesScreen(): ReactElement {
  const user = useUser()
  const navigate = useNavigate()
  const search = useRouterState({ select: (state) => state.location.search })
  const named = toCasesSearch(search).lista
  const filter = filters.find((candidate) => candidate.value === named) ?? mine
  const [query, setQuery] = useState("")
  const { cases, error, isPending, people, refetch } = useCases()
  const { canOpen } = useCasesAccess()

  const at = new Date()
  const needle = query.trim().toLocaleLowerCase("sv")
  const ownUnit = useOwnUnit()
  const matching = cases.filter((item) => isMatch(item, people, needle, ownUnit))
  const listings = listingsOf(filter, matching, at, user?.memberNo)
    .map((listing) => ({ ...listing, cases: byLastActivity(listing.cases) }))
    .filter((listing) => listing.cases.length > 0)
  // How many each list holds of what the search matches, so a search shows which list its
  // matches are in. Unknown while the cases are on their way, rather than none.
  const counts = isPending
    ? undefined
    : filters.map((candidate) =>
        listingsOf(candidate, matching, at, user?.memberNo).reduce(
          (sum, listing) => sum + listing.cases.length,
          0,
        ),
      )
  const isEmpty = !isPending && error === null && listings.length === 0

  return (
    <>
      <PageTitle title={casesSectionLabel} />
      <PageActions
        action={
          canOpen
            ? {
                icon: <PlusIcon size={26} strokeWidth={2.2} />,
                label: "Nytt ärende",
                link: { to: "/cases/new" },
              }
            : undefined
        }
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
        countSaid={(count) => (count === 1 ? "1 ärende" : `${String(count)} ärenden`)}
        counts={counts}
        current={Math.max(0, filters.indexOf(filter))}
        entries={filters.map((candidate) => candidate.segment)}
        label="Filtrera ärenden"
        onPick={(index) => {
          const picked = filters.at(index)?.value
          // Replacing, because choosing a list is not somewhere the reader went.
          void navigate({
            replace: true,
            search: picked === undefined || picked === "mine" ? {} : { lista: picked },
            to: "/cases",
            viewTransition: false,
          })
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

      {listings.map((listing) => (
        <CaseList
          cases={listing.cases}
          // Only the reader's own are split into lists, so only theirs need headings to
          // tell them apart; every other filter's one list is named by its segment.
          isTitleShown={filter.value === "mine"}
          key={listing.title}
          people={people}
          title={listing.title}
        />
      ))}

      {isEmpty && (
        <Card>
          <p className="cases-empty">
            {needle === "" ? filter.empty : "Inga ärenden matchar sökningen."}
          </p>
        </Card>
      )}
    </>
  )
}
