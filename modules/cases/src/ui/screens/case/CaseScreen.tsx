import {
  Button,
  ConfirmDialog,
  Gallery,
  PageActions,
  PageTitle,
  ParticipantsIcon,
  PencilIcon,
  PersonIcon,
  Timeline,
  TimelineEntry,
  type GalleryPicture,
  type OverflowMenuItem,
} from "@scouterna/wsj27-campfire-ui"
import { useRoles, useUser } from "@scouterna/wsj27-campfire-utils"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useId, useState, type ReactElement } from "react"

import { fetchCaseTypesQuery } from "../../../data/fetch-case-types"
import type { Attachment } from "../../../model/Attachment"
import { aboutName, scopeOf, type Case } from "../../../model/Case"
import type { Note } from "../../../model/Note"
import { nameOf, type People, type Person } from "../../../model/Person"
import { noteAudience, noteLevels } from "../../../model/SecrecyLevel"
import { canShare, isRoleHolder } from "../../case-roles"
import { SubjectCard } from "../../components/subjectcard/SubjectCard"
import { AccessCard } from "./AccessCard"
import { Composer } from "./Composer"
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
   * Who alone a note is for, when it is more secret than its case.
   */
  readonly audience?: string
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
   * The pictures attached to a note, oldest first.
   */
  readonly pictures?: readonly Attachment[]
  /**
   * The entry's heading – who wrote the note, or what happened.
   */
  readonly title: string
}

/**
 * A note's pictures as a gallery, each named by its place, since a picture carries no
 * caption of its own.
 * @param attachments The pictures, oldest first.
 * @returns The gallery's pictures.
 */
function galleryOf(attachments: readonly Attachment[]): readonly GalleryPicture[] {
  return attachments.map((attachment, index) => ({
    height: attachment.height,
    image: attachment.picture,
    key: attachment.id,
    thumbnail: attachment.thumbnail,
    title:
      attachments.length === 1
        ? "Bild"
        : `Bild ${String(index + 1)} av ${String(attachments.length)}`,
    width: attachment.width,
  }))
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
    ...(note.attachments.length > 0 && { pictures: note.attachments }),
    // A note under its case's own title says nothing by repeating it, so only a note
    // under a title of its own leads with one.
    ...(note.title !== "" && note.title !== item.title && { noteTitle: note.title }),
    // Only a note more secret than its case is marked, since the case already says who
    // sees everything else on it.
    ...(note.secrecyLevel > item.secrecyLevel && {
      audience: noteAudience(note.secrecyLevel, item.secrecyLevel, scopeOf(item)),
    }),
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

interface TitleEditorProps {
  /**
   * Whether a write is under way, which holds the buttons still.
   */
  readonly isBusy: boolean
  /**
   * Puts the editor away without saving.
   */
  readonly onCancel: () => void
  /**
   * Saves the new title, then calls `onSaved` so the editor can be put away.
   */
  readonly onSave: (title: string, onSaved: () => void) => void
  /**
   * The title as it stands, which the field starts from.
   */
  readonly title: string
}

/**
 * The case's title opened for a new one, on a card of its own over the case. Saved with
 * Enter or the button, and only once it says something different.
 * @param props The title, and what saving and canceling do.
 * @returns The card.
 */
function TitleEditor(props: TitleEditorProps): ReactElement {
  const [draft, setDraft] = useState(props.title)
  const id = useId()
  const next = draft.trim()
  const canSave = next !== "" && next !== props.title && !props.isBusy

  // The editor opens from the menu, which hands focus back to its trigger as it closes,
  // so the field takes it on the next frame rather than as it mounts.
  const focusOnOpen = useCallback((node: HTMLInputElement | null) => {
    if (node !== null) {
      requestAnimationFrame(() => {
        node.select()
      })
    }
  }, [])

  const save = (): void => {
    if (canSave) {
      props.onSave(next, props.onCancel)
    }
  }

  return (
    <form
      aria-labelledby={id}
      className="card case-rename"
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <label className="case-rename-label" htmlFor={`${id}-field`} id={id}>
        Rubrik
      </label>
      <input
        autoComplete="off"
        className="case-rename-field"
        id={`${id}-field`}
        onChange={(event) => {
          setDraft(event.target.value)
        }}
        ref={focusOnOpen}
        value={draft}
      />
      <div className="case-rename-actions">
        <Button label="Avbryt" onPress={props.onCancel} variant="plain" />
        <Button disabled={!canSave} label="Spara" onPress={save} />
      </div>
    </form>
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
 * The case's history down its timeline, newest first, under the line saying where its
 * notes are while they are on their way or could not be read.
 * @param props The case, its notes and their state, the names, and the reader.
 * @returns The history.
 */
function CaseHistory(
  props: CaseBodyProps & { readonly readerMemberNo: string | undefined },
): ReactElement {
  let notesStatus: string | undefined
  if (props.notesPending) {
    notesStatus = "Hämtar anteckningarna …"
  } else if (props.notesError !== null) {
    notesStatus = "Anteckningarna kunde inte hämtas."
  }

  return (
    <>
      {notesStatus !== undefined && (
        <p className="case-notes-status" role="status">
          {notesStatus}
        </p>
      )}

      <Timeline label="Anteckningar">
        {historyOf(props.item, props.notes, props.people, props.readerMemberNo).map((entry) => (
          <TimelineEntry
            at={entry.at}
            audience={entry.audience}
            isEvent={entry.isEvent}
            key={entry.key}
            title={entry.title}
          >
            {entry.noteTitle !== undefined && <strong>{entry.noteTitle}</strong>}
            {entry.body}
            {entry.pictures !== undefined && (
              <div className="case-note-pictures">
                <Gallery label="Bilder" placeholder="Bild" pictures={galleryOf(entry.pictures)} />
              </div>
            )}
          </TimelineEntry>
        ))}
      </Timeline>
    </>
  )
}

/**
 * The case's menu: renaming while it is open, and the way to the person it is about and
 * to their unit. Sharing is not here, because the card that says who sees the case offers
 * it where the reader is already looking.
 * @param item The case.
 * @param about The person it is about, undefined while the names are loading.
 * @param onRename Opens the title for a new one.
 * @returns The entries, empty when there are none.
 */
function menuFor(
  item: Case,
  about: Person | undefined,
  onRename: () => void,
): readonly OverflowMenuItem[] {
  const menu: OverflowMenuItem[] = []
  // A closed case cannot be changed until it is reopened, so only an open one offers it.
  if (!item.isClosed) {
    menu.push({
      icon: <PencilIcon size={20} />,
      label: "Byt rubrik",
      onSelect: onRename,
    })
  }
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
      link: { params: { group: about.troop }, to: "/participants/groups/$group" },
    })
  }
  return menu
}

/**
 * The case once it has arrived: who it is about, what kind of case it is and who sees it,
 * the field for a new note while it is open, and its history. Closing – asked about
 * first – and reopening sit beside the page's menu, because they are done now and then
 * rather than every visit.
 * @param props The case, its notes, and the names to show them with.
 * @returns The screen's content.
 */
function CaseBody(props: CaseBodyProps): ReactElement {
  const { item, people } = props
  const user = useUser()
  const actions = useCaseActions(item.id)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const roles = useRoles()
  const { data: types } = useQuery(fetchCaseTypesQuery())
  const reader = { memberNo: user?.memberNo, roles, types }
  const isSharable = canShare(item, reader)
  const about = item.aboutMemberNo === undefined ? undefined : people?.get(item.aboutMemberNo)
  const name = aboutName(item, people)

  const menu = menuFor(item, about, () => {
    setIsRenaming(true)
  })

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

      {isRenaming && !item.isClosed && (
        <TitleEditor
          isBusy={actions.isBusy}
          onCancel={() => {
            setIsRenaming(false)
          }}
          onSave={actions.rename}
          title={item.title}
        />
      )}

      <SubjectCard about={about} name={name} />

      <AccessCard
        canShare={isSharable}
        isBusy={actions.isBusy}
        item={item}
        onShare={actions.share}
        people={people}
        readerMemberNo={user?.memberNo}
      />

      {!item.isClosed && (
        <Composer
          caseLevel={item.secrecyLevel}
          isBusy={actions.isBusy}
          levels={noteLevels(item.secrecyLevel, scopeOf(item), isRoleHolder(item, reader))}
          onAdd={(text, level, pictures, progress) => {
            actions.addNote({ level, pictures, text, title: item.title }, progress)
          }}
          onAttach={actions.attachPictures}
          scope={scopeOf(item)}
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

      <CaseHistory {...props} readerMemberNo={user?.memberNo} />
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
