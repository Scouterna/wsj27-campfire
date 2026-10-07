import {
  Button,
  ConfirmDialog,
  PageActions,
  PageTitle,
  ParticipantsIcon,
  PersonIcon,
  Timeline,
  TimelineEntry,
  type OverflowMenuItem,
} from "@scouterna/wsj27-campfire-ui"
import { useUser } from "@scouterna/wsj27-campfire-utils"
import { useId, useState, type ReactElement } from "react"

import { aboutName, type Case } from "../../../model/Case"
import type { Note } from "../../../model/Note"
import { nameOf, type People } from "../../../model/Person"
import { SubjectCard } from "../../components/subjectcard/SubjectCard"
import { useCase } from "./use-case"
import { useCaseActions } from "./use-case-actions"

import "./CaseScreen.css"

export interface CaseScreenProps {
  /**
   * Which case to show – the identifier the address's `$caseId` parameter carries.
   */
  readonly caseId: string
}

/**
 * What the chrome calls the page before the case's title is known. Kept through the
 * failure state too, because a case that could not be read has no better name.
 */
const pendingTitle = "Ärende"

/**
 * One entry of the case's history – a note, or a moment something happened to the case.
 */
interface HistoryEntry {
  /**
   * When it happened, which orders the history.
   */
  readonly at: Date
  /**
   * The entry's body – the note's text, or the sentence telling the event.
   */
  readonly body: string
  /**
   * Whether the entry is an event rather than a note.
   */
  readonly isEvent: boolean
  /**
   * A key unique within the history.
   */
  readonly key: string
  /**
   * The heading a note was written under, where it is one of its own rather than its
   * case's title.
   */
  readonly noteTitle?: string
  /**
   * The entry's heading – who wrote the note, or what happened.
   */
  readonly title: string
}

/**
 * The case's history, newest first: its notes, the moment it was opened, and – while it
 * is closed – the moment it was closed. The service keeps no record of a reopening, so a
 * reopened case's history reads as if it had never closed.
 * @param item The case.
 * @param notes The case's notes.
 * @param people Everyone the history names, undefined while the names are loading.
 * @param memberNo The reader's own member number, so their notes are marked as theirs.
 * @returns The entries, newest first.
 */
function historyOf(
  item: Case,
  notes: readonly Note[],
  people: People | undefined,
  memberNo: string | undefined,
): readonly HistoryEntry[] {
  const who = (author: string): string => {
    const name = nameOf(people, author)
    return author === memberNo ? `${name} (du)` : name
  }

  const entries: HistoryEntry[] = notes.map((note) => ({
    at: note.createdAt,
    body: note.text,
    isEvent: false,
    key: `note-${note.id}`,
    // A note under its case's own title says nothing by repeating it, so only a note
    // under a title of its own leads with one.
    ...(note.title !== "" && note.title !== item.title && { noteTitle: note.title }),
    title: who(note.authorMemberNo),
  }))
  entries.push({
    at: item.createdAt,
    body: `${nameOf(people, item.creatorMemberNo)} skapade ärendet.`,
    isEvent: true,
    key: "created",
    title: "Ärendet skapades",
  })
  if (item.isClosed && item.closedAt !== undefined) {
    const closer =
      item.closedByMemberNo === undefined ? "Någon" : nameOf(people, item.closedByMemberNo)
    entries.push({
      at: item.closedAt,
      body: `${closer} avslutade ärendet.`,
      isEvent: true,
      key: "closed",
      title: "Ärendet avslutades",
    })
  }
  return entries.toSorted((left, right) => right.at.getTime() - left.at.getTime())
}

interface ComposerProps {
  /**
   * Whether a write is under way, which holds the button still.
   */
  readonly isBusy: boolean
  /**
   * Writes the note, then calls `onAdded` so the field can be emptied.
   */
  readonly onAdd: (text: string, onAdded: () => void) => void
}

/**
 * The field a new note is written in, and the button that adds it to the case.
 * @param props What adding does, and whether it is under way.
 * @returns The card.
 */
function Composer(props: ComposerProps): ReactElement {
  const [draft, setDraft] = useState("")
  const id = useId()

  return (
    <section aria-labelledby={id} className="card case-compose">
      <label className="case-compose-label" htmlFor={`${id}-field`} id={id}>
        Ny anteckning
      </label>
      <textarea
        className="case-compose-field"
        id={`${id}-field`}
        onChange={(event) => {
          setDraft(event.target.value)
        }}
        placeholder="Skriv en anteckning…"
        rows={2}
        value={draft}
      />
      <div className="case-compose-actions">
        <Button
          disabled={draft.trim() === "" || props.isBusy}
          label="Lägg till anteckning"
          onPress={() => {
            props.onAdd(draft.trim(), () => {
              setDraft("")
            })
          }}
        />
      </div>
    </section>
  )
}

interface CaseBodyProps {
  /**
   * The case.
   */
  readonly item: Case
  /**
   * The case's notes, newest first.
   */
  readonly notes: readonly Note[]
  /**
   * Why the notes could not be read, or null while they can be.
   */
  readonly notesError: Error | null
  /**
   * Whether the notes are still on their way.
   */
  readonly notesPending: boolean
  /**
   * Everyone the case and its notes name, undefined until the names arrive.
   */
  readonly people: People | undefined
}

/**
 * The case once it has arrived: who it is about, the field for a new note while it is
 * open, and its history. Closing – asked about first – and reopening sit beside the
 * page's menu, because they are done now and then rather than every visit.
 * @param props The case, its notes, and the names to show them with.
 * @returns The screen's content.
 */
function CaseBody(props: CaseBodyProps): ReactElement {
  const { item, people } = props
  const user = useUser()
  const actions = useCaseActions(item.id)
  const [isConfirming, setIsConfirming] = useState(false)
  const about = item.aboutMemberNo === undefined ? undefined : people?.get(item.aboutMemberNo)
  const name = aboutName(item, people)

  const menu: OverflowMenuItem[] = []
  if (item.aboutMemberNo !== undefined) {
    menu.push({
      icon: <PersonIcon size={20} />,
      label: "Visa deltagaren",
      link: { params: { memberNo: item.aboutMemberNo }, to: "/participants/$memberNo" },
    })
  }
  if (about?.troop !== undefined && /^\d+$/u.test(about.troop)) {
    menu.push({
      icon: <ParticipantsIcon size={20} />,
      label: "Visa avdelningen",
      link: { params: { unit: about.troop }, to: "/participants/units/$unit" },
    })
  }

  let notesStatus: string | undefined
  if (props.notesPending) {
    notesStatus = "Hämtar anteckningarna …"
  } else if (props.notesError !== null) {
    notesStatus = "Anteckningarna kunde inte hämtas."
  }

  return (
    <>
      <PageTitle title={item.title} />
      <PageActions
        menu={menu.length > 0 ? menu : undefined}
        secondary={
          item.isClosed
            ? { disabled: actions.isBusy, label: "Återöppna", onPress: actions.reopen }
            : {
                disabled: actions.isBusy,
                label: "Avsluta",
                onPress: () => {
                  setIsConfirming(true)
                },
              }
        }
      />

      <SubjectCard about={about} name={name} />

      {!item.isClosed && (
        <Composer
          isBusy={actions.isBusy}
          onAdd={(text, onAdded) => {
            actions.addNote(text, item.title, onAdded)
          }}
        />
      )}

      <ConfirmDialog
        confirmLabel="Avsluta ärendet"
        description="Ärendet flyttas till Avslutade. Du kan öppna det igen senare."
        isOpen={isConfirming}
        onCancel={() => {
          setIsConfirming(false)
        }}
        onConfirm={() => {
          setIsConfirming(false)
          actions.close()
        }}
        title="Avsluta ärendet?"
      />

      {actions.failure !== undefined && (
        <p className="case-failure" role="alert">
          {actions.failure}
        </p>
      )}

      {notesStatus !== undefined && (
        <p className="case-notes-status" role="status">
          {notesStatus}
        </p>
      )}

      <Timeline label="Anteckningar">
        {historyOf(item, props.notes, people, user?.memberNo).map((entry) => (
          <TimelineEntry at={entry.at} isEvent={entry.isEvent} key={entry.key} title={entry.title}>
            {entry.noteTitle !== undefined && <strong>{entry.noteTitle}</strong>}
            {entry.body}
          </TimelineEntry>
        ))}
      </Timeline>
    </>
  )
}

/**
 * One case: who it is about, a new note and the way to close it while it is open – or
 * the way to reopen it once closed – and its history newest first.
 * @param props Which case to show.
 * @returns The screen.
 */
export function CaseScreen(props: CaseScreenProps): ReactElement {
  const { error, found, isPending, notes, notesError, notesPending, people } = useCase(props.caseId)

  if (isPending) {
    return (
      <>
        <PageTitle title={pendingTitle} />
        <p className="case-notes-status" role="status">
          Hämtar ärendet …
        </p>
      </>
    )
  }

  if (error !== null || found === undefined) {
    // One wording for a case that does not exist, one the reader may not see, and a
    // service that did not answer, because telling them apart would say which cases
    // exist, and a second ask gets the same answer.
    return (
      <>
        <PageTitle title={pendingTitle} />
        <p className="case-notes-status" role="status">
          Ärendet kunde inte visas.
        </p>
      </>
    )
  }

  return (
    <CaseBody
      item={found}
      notes={notes}
      notesError={notesError}
      notesPending={notesPending}
      people={people}
    />
  )
}
