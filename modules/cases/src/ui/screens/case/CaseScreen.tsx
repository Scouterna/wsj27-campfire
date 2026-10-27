import {
  Button,
  ConfirmDialog,
  Gallery,
  PageActions,
  PageTitle,
  ParticipantsIcon,
  PencilIcon,
  PersonIcon,
  PersonPlusIcon,
  Timeline,
  TimelineEntry,
  type GalleryPicture,
  type OverflowMenuItem,
} from "@scouterna/wsj27-campfire-ui"
import { useRoles, useUser } from "@scouterna/wsj27-campfire-utils"
import { useQuery } from "@tanstack/react-query"
import { useId, useState, type ReactElement } from "react"

import { fetchCaseTypesQuery } from "../../../data/fetch-case-types"
import type { Attachment } from "../../../model/Attachment"
import { isAboutUnit, scopeOf, unitsOfCase, type Case } from "../../../model/Case"
import type { Note } from "../../../model/Note"
import { nameOf, type People } from "../../../model/Person"
import { noteLevels } from "../../../model/SecrecyLevel"
import { useOwnUnit } from "../../use-people"
import { AboutCard } from "./AboutCard"
import { AccessCard } from "./AccessCard"
import { historyOf } from "./case-history"
import { canShare, isRoleHolder } from "./case-roles"
import { Composer } from "./Composer"
import { focusOnOpen } from "./focus-on-open"
import { useCase } from "./use-case"
import { useCaseActions } from "./use-case-actions"

import "./CaseScreen.css"

/**
 * The case the screen shows, by the identifier the address carries.
 */
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

  const save = (): void => {
    if (canSave) {
      props.onSave(next, props.onCancel)
    }
  }

  return (
    <form
      aria-labelledby={id}
      className="card case-rename"
      ref={focusOnOpen}
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

interface CaseHistoryProps extends CaseBodyProps {
  /**
   * The reader's own member number, so their notes are marked as theirs.
   */
  readonly readerMemberNo: string | undefined
}

/**
 * The case's history down its timeline, newest first, under the line saying where its
 * notes are while they are on their way or could not be read.
 * @param props The case, its notes and their state, the names, and the reader.
 * @returns The history.
 */
function CaseHistory(props: CaseHistoryProps): ReactElement {
  const ownUnit = useOwnUnit()
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
        {historyOf(props.item, props.notes, props.people, props.readerMemberNo, ownUnit).map(
          (entry) => (
            <TimelineEntry
              at={entry.at}
              audience={entry.audience}
              isEvent={entry.isEvent}
              key={entry.key}
              subtitle={entry.subtitle}
              title={entry.title}
            >
              {entry.body}
              {entry.pictures !== undefined && (
                <div className="case-note-pictures">
                  <Gallery label="Bilder" placeholder="Bild" pictures={galleryOf(entry.pictures)} />
                </div>
              )}
            </TimelineEntry>
          ),
        )}
      </Timeline>
    </>
  )
}

/**
 * What the case's menu opens on the page.
 */
interface MenuActions {
  /**
   * Opens the card for adding someone to the case, undefined for a reader who may not.
   */
  readonly onAddPerson: (() => void) | undefined
  /**
   * Opens the title for a new one.
   */
  readonly onRename: () => void
}

/**
 * The case's menu: renaming, and adding someone to a case about people, while it is open,
 * and under a rule the way to each person it is about and to its unit, so what changes
 * the case stands apart from where it leads. Adding someone is here rather than on the
 * cards, because a case is usually about one person. Sharing is not, because the card
 * that says who sees the case offers it where the reader is already looking.
 * @param item The case the menu is for.
 * @param people Everyone the module knows, which names each of several people.
 * @param actions What the entries open.
 * @returns The entries, empty when there are none.
 */
function menuFor(
  item: Case,
  people: People | undefined,
  actions: MenuActions,
): readonly OverflowMenuItem[] {
  const changes: OverflowMenuItem[] = []
  const ways: OverflowMenuItem[] = []
  // A closed case cannot be changed until it is reopened, so only an open one offers it.
  if (!item.isClosed) {
    changes.push({
      icon: <PencilIcon size={20} />,
      label: "Byt rubrik",
      onSelect: actions.onRename,
    })
  }
  if (!item.isClosed && actions.onAddPerson !== undefined) {
    changes.push({
      icon: <PersonPlusIcon size={20} />,
      label: "Lägg till person",
      onSelect: actions.onAddPerson,
    })
  }
  // Each of several people is named, since one alone needs no name to be told apart.
  const about = item.aboutMemberNos
  for (const memberNo of about) {
    ways.push({
      icon: <PersonIcon size={20} />,
      label: about.length === 1 ? "Visa personen" : `Visa ${nameOf(people, memberNo)}`,
      link: { params: { memberNo }, to: "/participants/$memberNo" },
    })
  }
  // Only where the people share one unit, since a case about several units has no one
  // unit to show.
  const [unit, ...others] = unitsOfCase(item, people)
  if (unit !== undefined && others.length === 0) {
    ways.push({
      icon: <ParticipantsIcon size={20} />,
      label: "Visa avdelningen",
      link: { params: { group: String(unit) }, to: "/participants/groups/$group" },
    })
  }
  // The rule only between the two, so a closed case's menu does not open on one.
  return changes.length > 0 && ways.length > 0
    ? [...changes, "divider", ...ways]
    : [...changes, ...ways]
}

interface ClosingDialogProps {
  /**
   * Whether a note or pictures are still waiting to be sent, and would be lost.
   */
  readonly hasUnsent: boolean
  /**
   * Whether the question is being asked.
   */
  readonly isOpen: boolean
  /**
   * Leaves the case open.
   */
  readonly onCancel: () => void
  /**
   * Closes the case.
   */
  readonly onClose: () => void
}

/**
 * The question asked before a case is closed, saying it can be opened again – and,
 * where something is still to be sent, that closing lets it go, because a closed case
 * has nowhere to write it.
 * @param props Whether it is asked, whether anything would be lost, and what each answer
 * does.
 * @returns The dialog.
 */
function ClosingDialog(props: ClosingDialogProps): ReactElement {
  const opened = "Ärendet flyttas till Avslutade. Du kan öppna det igen senare."
  return (
    <ConfirmDialog
      confirmLabel="Avsluta ärendet"
      description={
        props.hasUnsent
          ? `${opened} Det du skrivit men inte skickat försvinner, liksom bilder som inte kommit fram.`
          : opened
      }
      isOpen={props.isOpen}
      onCancel={props.onCancel}
      onConfirm={props.onClose}
      title="Avsluta ärendet?"
    />
  )
}

/**
 * Which of the cards the page's menu opens are open.
 */
interface Editors {
  /**
   * Whether the card for adding someone is open.
   */
  readonly isAdding: boolean
  /**
   * Whether the title is open for a new one.
   */
  readonly isRenaming: boolean
  /**
   * Opens or puts away the card for adding someone.
   */
  readonly setIsAdding: (isAdding: boolean) => void
  /**
   * Opens or puts away the title for a new one.
   */
  readonly setIsRenaming: (isRenaming: boolean) => void
}

/**
 * The cards the page's menu opens, put away for good as the case closes, however it came
 * to be closed, so reopening it never brings one back unasked.
 * @param isClosed Whether the case is closed.
 * @returns Which are open, and what opens and puts each away.
 */
function useEditors(isClosed: boolean): Editors {
  const [isRenaming, setIsRenaming] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  if (isClosed && (isRenaming || isAdding)) {
    setIsRenaming(false)
    setIsAdding(false)
  }
  return { isAdding, isRenaming, setIsAdding, setIsRenaming }
}

/**
 * The question asked before a case is closed, and what the note card has told it.
 */
interface Closing {
  /**
   * Asks the question.
   */
  readonly ask: () => void
  /**
   * The dialog the question is asked in.
   */
  readonly dialog: ClosingDialogProps
  /**
   * Hears from the note card whether it holds something not yet sent.
   */
  readonly onUnsentChange: (hasUnsent: boolean) => void
}

/**
 * The question before a case is closed – whether it is being asked, and whether closing
 * would let go of something not yet sent.
 * @param close Closes the case, once the question is answered yes.
 * @returns What asks it, the dialog it is asked in, and what the note card reports to.
 */
function useClosing(close: () => void): Closing {
  const [isOpen, setIsOpen] = useState(false)
  const [hasUnsent, setHasUnsent] = useState(false)
  return {
    ask: () => {
      setIsOpen(true)
    },
    dialog: {
      hasUnsent,
      isOpen,
      onCancel: () => {
        setIsOpen(false)
      },
      onClose: () => {
        setIsOpen(false)
        close()
      },
    },
    onUnsentChange: setHasUnsent,
  }
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
  const closing = useClosing(actions.close)
  const { isAdding, isRenaming, setIsAdding, setIsRenaming } = useEditors(item.isClosed)
  const roles = useRoles()
  const { data: types } = useQuery(fetchCaseTypesQuery())
  const reader = { memberNo: user?.memberNo, roles, types }
  const isSharable = canShare(item, reader)
  const canChangePeople = !item.isClosed && isRoleHolder(item, reader)
  const menu = menuFor(item, people, {
    // A case about a unit as a whole stays about the whole unit, so nobody is added to it.
    onAddPerson:
      canChangePeople && !isAboutUnit(item)
        ? () => {
            setIsAdding(true)
          }
        : undefined,
    onRename: () => {
      setIsRenaming(true)
    },
  })

  return (
    <>
      <PageTitle title={item.title} />
      <PageActions
        menu={menu.length > 0 ? menu : undefined}
        secondary={{
          disabled: actions.isBusy,
          label: item.isClosed ? "Återöppna" : "Avsluta",
          onPress: item.isClosed ? actions.reopen : closing.ask,
        }}
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

      <AboutCard
        canChange={canChangePeople}
        isAdding={isAdding}
        isBusy={actions.isBusy}
        item={item}
        onChange={actions.changePeople}
        onDoneAdding={() => {
          setIsAdding(false)
        }}
        people={people}
      />

      <AccessCard
        canAssign={!item.isClosed}
        canShare={isSharable}
        isBusy={actions.isBusy}
        item={item}
        onAssign={actions.assign}
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
          onUnsentChange={closing.onUnsentChange}
          scope={scopeOf(item)}
        />
      )}

      <ClosingDialog {...closing.dialog} />

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
