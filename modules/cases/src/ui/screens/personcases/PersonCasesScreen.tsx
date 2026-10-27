import { Button, Card, PageActions, PageTitle, PlusIcon } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import { byLastActivity } from "../../../model/Case"
import { nameOf } from "../../../model/Person"
import { CaseList } from "../../components/caselist/CaseList"
import { SubjectCard } from "../../components/subjectcard/SubjectCard"
import { casesSectionLabel } from "../../section-label"
import { useCasesAccess } from "../../use-cases-access"
import { useCases } from "../cases/use-cases"

import "./PersonCasesScreen.css"

/**
 * The person whose cases the screen shows, by member number.
 */
export interface PersonCasesScreenProps {
  /**
   * Whose cases to show – the member number the address's `$memberNo` parameter carries.
   */
  readonly memberNo: string
}

/**
 * Every case about one person – alone or among others – open and closed, the latest
 * change first, under a card saying who they are, and the way to open another about them.
 * @param props Whose cases to show.
 * @returns The screen.
 */
export function PersonCasesScreen(props: PersonCasesScreenProps): ReactElement {
  const { cases, error, isPending, people, refetch } = useCases()
  const { canOpen } = useCasesAccess()
  const about = people?.get(props.memberNo)
  const name = nameOf(people, props.memberNo)

  // The latest change first, as every list of cases is ordered.
  const theirs = byLastActivity(
    cases.filter((item) => item.aboutMemberNos.includes(props.memberNo)),
  )
  const open = theirs.filter((item) => !item.isClosed)
  const closed = theirs.filter((item) => item.isClosed)

  return (
    <>
      <PageTitle title={casesSectionLabel} />
      <PageActions
        action={
          canOpen
            ? {
                icon: <PlusIcon size={26} strokeWidth={2.2} />,
                label: "Nytt ärende",
                link: { params: { memberNo: props.memberNo }, to: "/cases/new/$memberNo" },
              }
            : undefined
        }
      />

      <SubjectCard about={about} name={name} />

      {isPending && (
        <p className="person-cases-status" role="status">
          Hämtar ärendena …
        </p>
      )}

      {!isPending && error !== null && (
        <>
          <p className="person-cases-status" role="alert">
            Ärendena kunde inte hämtas.
          </p>
          <Button label="Försök igen" onPress={refetch} />
        </>
      )}

      {open.length > 0 && (
        <CaseList cases={open} isAboutShown={false} people={people} title="Öppna ärenden" />
      )}
      {closed.length > 0 && (
        <CaseList cases={closed} isAboutShown={false} people={people} title="Avslutade" />
      )}

      {!isPending && error === null && theirs.length === 0 && (
        <Card>
          <p className="person-cases-empty">Inga ärenden om {name}.</p>
        </Card>
      )}
    </>
  )
}
