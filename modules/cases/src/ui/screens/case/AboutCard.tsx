import { Button } from "@scouterna/wsj27-campfire-ui"
import { useId, useMemo, type ReactElement } from "react"

import { scopeOf, unitOfCase, type Case } from "../../../model/Case"
import { canBeAbout } from "../../../model/CaseType"
import { nameOf, type People, type Person } from "../../../model/Person"
import { PersonPicker } from "../../components/personpicker/PersonPicker"
import { SubjectCard } from "../../components/subjectcard/SubjectCard"
import { useOwnUnit } from "../../use-people"
import { focusOnOpen } from "./focus-on-open"

import "./AboutCard.css"

/**
 * The case, its names, whether it may be changed, and what changing does.
 */
export interface AboutCardProps {
  /**
   * Whether the reader may change who the case is about – its type's own role holders,
   * while it is open – so each of several people carries a way to take them off.
   */
  readonly canChange: boolean
  /**
   * Whether the card for adding someone is open, which the page's menu does.
   */
  readonly isAdding: boolean
  /**
   * Whether a write is under way, which holds the buttons still.
   */
  readonly isBusy: boolean
  /**
   * The case.
   */
  readonly item: Case
  /**
   * Makes the case about exactly these people, then calls `onChanged`, when there is one.
   */
  readonly onChange: (memberNos: readonly string[], onChanged?: () => void) => void
  /**
   * Puts the card for adding someone away.
   */
  readonly onDoneAdding: () => void
  /**
   * Everyone the module knows, undefined while the names are loading.
   */
  readonly people: People | undefined
}

interface AddingCardProps {
  /**
   * Whether a write is under way, which holds the matches still.
   */
  readonly isBusy: boolean
  /**
   * The case, whose scope decides who may be added.
   */
  readonly item: Case
  /**
   * Adds the person chosen.
   */
  readonly onAdd: (person: Person) => void
  /**
   * Puts the card away without adding anyone.
   */
  readonly onCancel: () => void
}

/**
 * Someone more to make the case about, chosen through a search on a card of its own under
 * the people it is about already – anyone the case's scope may be about who is not on it.
 * @param props The case, and what choosing and canceling do.
 * @returns The card.
 */
function AddingCard(props: AddingCardProps): ReactElement {
  const { item } = props
  const id = useId()
  const isOffered = useMemo(() => {
    const taken = new Set(item.aboutMemberNos)
    const within = scopeOf(item)
    return (person: Person): boolean => !taken.has(person.memberNo) && canBeAbout(within, person)
  }, [item])
  const { unitNumber } = scopeOf(item)
  const ownUnit = useOwnUnit()
  let nobodyText = "Ingen som inte redan finns med heter så."
  if (unitNumber !== undefined) {
    const unit = unitNumber === ownUnit ? "avdelningen" : `avdelning ${String(unitNumber)}`
    nobodyText = `Ingen mer deltagare i ${unit} heter så.`
  }

  return (
    <section aria-labelledby={id} className="card about-card-adding" ref={focusOnOpen}>
      <div className="about-card-adding-head">
        <p className="about-card-label" id={id}>
          Lägg till person
        </p>
        <Button label="Avbryt" onPress={props.onCancel} variant="plain" />
      </div>
      <PersonPicker
        isBusy={props.isBusy}
        isOffered={isOffered}
        labelId={id}
        nobodyText={nobodyText}
        onPick={props.onAdd}
      />
    </section>
  )
}

/**
 * Who a case is about, a card each: every person, with the way to take them off while
 * there are several of them, or the unit as a whole for a case about nobody in it. The
 * card for adding someone opens under them from the page's menu, because a case is
 * usually about one person and adding another is the exception.
 * @param props The case, the names, whether someone is being added, and what changing does.
 * @returns The cards.
 */
export function AboutCard(props: AboutCardProps): ReactElement {
  const { item, onChange, people } = props
  const about = item.aboutMemberNos
  const unit = unitOfCase(item)
  const ownUnit = useOwnUnit()
  const unitTitle =
    unit !== undefined && unit === ownUnit ? "Hela avdelningen" : `Avdelning ${String(unit)}`
  // Taking off the one person a case is about would leave it about nobody, so only one of
  // several can be.
  const canRemove = props.canChange && about.length > 1

  return (
    <div aria-label="Gäller" className="about-cards" role="region">
      {about.map((memberNo) => {
        const name = nameOf(people, memberNo)
        return (
          <SubjectCard
            about={people?.get(memberNo)}
            action={
              canRemove
                ? {
                    isTaking: true,
                    label: "Ta bort",
                    onPress: () => {
                      onChange(about.filter((other) => other !== memberNo))
                    },
                  }
                : undefined
            }
            isBusy={props.isBusy}
            key={memberNo}
            label={name}
            name={name}
          />
        )
      })}
      {about.length === 0 && unit !== undefined && (
        <SubjectCard about={undefined} label={unitTitle} name={unitTitle} unitNumber={unit} />
      )}
      {about.length === 0 && unit === undefined && (
        <SubjectCard about={undefined} label="Ingen person angiven" name="Ingen person angiven" />
      )}
      {props.canChange && props.isAdding && (
        <AddingCard
          isBusy={props.isBusy}
          item={item}
          onAdd={(person) => {
            // The matches hold still while any write is under way, so the list sent here is
            // always built from a settled one. The card goes away once the write is through,
            // so a refused one leaves the search where it was.
            onChange([...about, person.memberNo], props.onDoneAdding)
          }}
          onCancel={props.onDoneAdding}
        />
      )}
    </div>
  )
}
