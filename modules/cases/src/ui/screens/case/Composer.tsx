import {
  Button,
  CheckIcon,
  CloseIcon,
  IconButton,
  PictureIcon,
  Select,
  SendIcon,
  type SelectOption,
} from "@scouterna/wsj27-campfire-ui"
import { useCallback, useEffect, useId, useRef, useState, type ReactElement } from "react"

import type { CaseScope } from "../../../model/CaseType"
import { isSecrecyLevel, noteAudience, type SecrecyLevel } from "../../../model/SecrecyLevel"
import type { PictureProgress, PictureState } from "./use-note-writes"

import "./Composer.css"

/**
 * The most pictures the cases service keeps on one note.
 */
const picturesPerNote = 10

/**
 * One picture chosen for the note, with the preview it is shown by and how far it has
 * come – waiting until the note is added.
 */
interface Chosen {
  /**
   * The picture as the phone's picker handed it over.
   */
  readonly file: File
  /**
   * What tells it apart from the others while the list changes, since two can be the
   * same file.
   */
  readonly key: string
  /**
   * The object URL the tile shows it by, freed when it goes.
   */
  readonly preview: string
  /**
   * How far it has come.
   */
  readonly state: PictureState | "waiting"
}

/**
 * The case's level and scope, the levels a note may take, and what sending does.
 */
export interface ComposerProps {
  /**
   * The case's own level, which a note takes unless the writer chooses a higher one.
   */
  readonly caseLevel: SecrecyLevel
  /**
   * Whether a write is under way, which holds the controls still.
   */
  readonly isBusy: boolean
  /**
   * The levels the writer may choose from, the case's own first. With only that one, the
   * choice is not offered.
   */
  readonly levels: readonly SecrecyLevel[]
  /**
   * Writes the note – at the chosen level when it is above the case's, undefined at the
   * case's own – and sends its pictures, telling the composer how each one goes.
   */
  readonly onAdd: (
    text: string,
    level: SecrecyLevel | undefined,
    pictures: readonly File[],
    progress: PictureProgress,
  ) => void
  /**
   * Sends pictures again to a note already written.
   */
  readonly onAttach: (noteId: string, pictures: readonly File[], progress: PictureProgress) => void
  /**
   * Hears whether the card holds something not yet sent – a draft, pictures chosen for
   * it, or pictures waiting to be sent again – which goes with the card when it goes.
   */
  readonly onUnsentChange: (hasUnsent: boolean) => void
  /**
   * The case's scope, which names whose role a level 4 note is for.
   */
  readonly scope: CaseScope
}

interface ChosenPicturesProps {
  /**
   * The pictures, in the order they were chosen.
   */
  readonly chosen: readonly Chosen[]
  /**
   * Takes a picture back out, or undefined while none may be.
   */
  readonly onRemove: ((key: string) => void) | undefined
}

/**
 * The chosen pictures as small tiles, each marked with how far it has come once the note
 * is on its way, and with a way to take it back out before.
 * @param props The pictures, and how one is removed.
 * @returns The tiles.
 */
function ChosenPictures(props: ChosenPicturesProps): ReactElement {
  const { onRemove } = props
  return (
    <ul aria-label="Bilder till anteckningen" className="case-compose-pictures">
      {props.chosen.map((item, index) => {
        const name = `Bild ${String(index + 1)}`
        return (
          <li className={`case-compose-picture case-compose-picture-${item.state}`} key={item.key}>
            <img alt={name} className="case-compose-thumbnail" src={item.preview} />
            {item.state === "waiting" && onRemove !== undefined && (
              <button
                aria-label={`Ta bort ${name.toLowerCase()}`}
                className="case-compose-remove"
                onClick={() => {
                  onRemove(item.key)
                }}
                type="button"
              >
                <CloseIcon size={14} strokeWidth={2.4} />
              </button>
            )}
            {item.state === "sent" && (
              <span aria-label="Skickad" className="case-compose-badge" role="img">
                <CheckIcon size={14} strokeWidth={2.6} />
              </span>
            )}
            {item.state === "failed" && (
              <span aria-label="Kom inte fram" className="case-compose-badge" role="img">
                !
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * The previews of chosen pictures, made from the files as they are chosen and let go of as
 * they leave, because each holds the file in memory until it is.
 * @returns The pictures, and a way to change them.
 */
function useChosen(): readonly [
  readonly Chosen[],
  (change: (chosen: readonly Chosen[]) => readonly Chosen[]) => void,
] {
  const [chosen, setChosen] = useState<readonly Chosen[]>([])
  const latest = useRef(chosen)
  useEffect(() => {
    latest.current = chosen
  }, [chosen])

  // Whatever is still chosen when the case is left goes with it.
  useEffect(
    () => () => {
      for (const item of latest.current) {
        URL.revokeObjectURL(item.preview)
      }
    },
    [],
  )

  const change = useCallback((update: (current: readonly Chosen[]) => readonly Chosen[]) => {
    setChosen((current) => {
      const next = update(current)
      const kept = new Set(next.map((item) => item.preview))
      for (const item of current) {
        if (!kept.has(item.preview)) {
          URL.revokeObjectURL(item.preview)
        }
      }
      return next
    })
  }, [])
  return [chosen, change]
}

/**
 * The pictures chosen for a note, and how they fare on their way.
 */
interface Pictures {
  /**
   * Adds pictures as they are chosen, up to what a note may carry.
   */
  readonly choose: (files: readonly File[]) => void
  /**
   * The pictures chosen, in the order they were.
   */
  readonly chosen: readonly Chosen[]
  /**
   * Lets every picture go.
   */
  readonly clear: () => void
  /**
   * Follows the pictures on their way, keeping only those that did not arrive.
   */
  readonly progress: PictureProgress
  /**
   * Takes one picture back out before it is sent.
   */
  readonly remove: (key: string) => void
  /**
   * Readies the pictures that did not arrive to be sent again.
   */
  readonly retry: () => void
  /**
   * A word about the pictures – that some were left out, or which is on its way.
   */
  readonly status: string | undefined
}

/**
 * The pictures chosen for a note: added and removed, marked as they go, and narrowed to
 * those that did not arrive once all have settled.
 * @param onSettled Told once the pictures have settled – the note, when some of its
 * pictures did not arrive, or undefined when all did.
 * @returns The pictures.
 */
function usePictures(onSettled: (stranded: string | undefined) => void): Pictures {
  const [chosen, change] = useChosen()
  const [notice, setNotice] = useState<string | undefined>(undefined)

  const sending = chosen.findIndex((item) => item.state === "sending")
  return {
    chosen,
    choose: (files) => {
      const room = picturesPerNote - chosen.length
      setNotice(
        files.length > room ? `Högst ${String(picturesPerNote)} bilder per anteckning.` : undefined,
      )
      const added = files.slice(0, Math.max(0, room)).map((file) => ({
        file,
        key: crypto.randomUUID(),
        preview: URL.createObjectURL(file),
        state: "waiting" as const,
      }))
      change((current) => [...current, ...added])
    },
    clear: () => {
      setNotice(undefined)
      change(() => [])
    },
    progress: {
      onPicture: (index, state) => {
        change((current) => current.map((item, at) => (at === index ? { ...item, state } : item)))
      },
      onSettled: (noteId, failed) => {
        setNotice(undefined)
        const left = new Set(failed)
        change((current) =>
          current.filter((_, at) => left.has(at)).map((item) => ({ ...item, state: "failed" })),
        )
        onSettled(failed.length > 0 ? noteId : undefined)
      },
    },
    remove: (key) => {
      setNotice(undefined)
      change((current) => current.filter((item) => item.key !== key))
    },
    retry: () => {
      change((current) => current.map((item) => ({ ...item, state: "waiting" })))
    },
    status:
      sending === -1 ? notice : `Skickar bild ${String(sending + 1)} av ${String(chosen.length)} …`,
  }
}

interface StrandedProps {
  /**
   * Whether the pictures are on their way again, which holds the buttons still.
   */
  readonly isBusy: boolean
  /**
   * Lets them go.
   */
  readonly onDrop: () => void
  /**
   * Sends them again.
   */
  readonly onRetry: () => void
  /**
   * The pictures that did not arrive.
   */
  readonly pictures: Pictures
}

/**
 * The pictures of a note already written that did not arrive, offered to be sent again or
 * let go – in the composer's place, so a new note is not begun with them still waiting.
 * @param props The pictures, and what each choice does.
 * @returns The card.
 */
function Stranded(props: StrandedProps): ReactElement {
  const id = useId()
  const count = props.pictures.chosen.length
  return (
    <section aria-labelledby={id} className="card case-compose">
      <p className="case-compose-stranded" id={id} role="alert">
        Anteckningen sparades, men {count === 1 ? "1 bild" : `${String(count)} bilder`} kom inte
        fram.
      </p>
      <ChosenPictures chosen={props.pictures.chosen} onRemove={undefined} />
      {props.pictures.status !== undefined && (
        <p className="case-compose-status" role="status">
          {props.pictures.status}
        </p>
      )}
      <div className="case-compose-actions">
        <Button
          disabled={props.isBusy}
          label={count === 1 ? "Strunta i den" : "Strunta i dem"}
          onPress={props.onDrop}
          variant="plain"
        />
        <Button disabled={props.isBusy} label="Försök igen" onPress={props.onRetry} />
      </div>
    </section>
  )
}

interface AttachProps {
  /**
   * Whether no more pictures may be chosen now.
   */
  readonly disabled: boolean
  /**
   * Called with the pictures chosen.
   */
  readonly onChoose: (files: readonly File[]) => void
}

/**
 * The button that opens the phone's own picker – the camera or the photo library – for
 * any picture it can show, a camera's HEIC included, because each is made a JPEG before
 * it is sent.
 * @param props Whether it is available, and what choosing does.
 * @returns The button, and the picker it opens.
 */
function Attach(props: AttachProps): ReactElement {
  const picker = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        accept="image/*"
        hidden
        multiple
        name="pictures"
        onChange={(event) => {
          props.onChoose([...(event.target.files ?? [])])
          // Emptied, so choosing the same picture again is still a change.
          event.target.value = ""
        }}
        ref={picker}
        type="file"
      />
      <IconButton
        disabled={props.disabled}
        icon={<PictureIcon size={20} />}
        label="Bifoga bild"
        onPress={() => {
          picker.current?.click()
        }}
      />
    </>
  )
}

interface ToolsProps {
  /**
   * Whether the note can be added now – it says something, and nothing is on its way.
   */
  readonly canAdd: boolean
  /**
   * Whether no more pictures may be chosen now.
   */
  readonly isAttachDisabled: boolean
  /**
   * The level chosen, as the choice's value.
   */
  readonly level: string
  /**
   * Adds the note.
   */
  readonly onAdd: () => void
  /**
   * Called with the pictures chosen.
   */
  readonly onChoose: (files: readonly File[]) => void
  /**
   * Called with the level chosen.
   */
  readonly onLevel: (value: string) => void
  /**
   * Who may read the note, its case's own level first. With only that one, the choice is
   * not offered.
   */
  readonly options: readonly SelectOption<string>[]
}

/**
 * The row along the field's foot: a picture, who reads the note, and the button that adds
 * it at the far end – icons where words would crowd a phone's width, and the one choice
 * that needs its words in between.
 * @param props What each tool does, and whether it can now.
 * @returns The row.
 */
function Tools(props: ToolsProps): ReactElement {
  return (
    <div className="case-compose-tools">
      <Attach disabled={props.isAttachDisabled} onChoose={props.onChoose} />
      {props.options.length > 1 && (
        <Select
          label="Vem ser anteckningen?"
          onChange={props.onLevel}
          options={props.options}
          value={props.level}
          variant="plain"
        />
      )}
      <span className="case-compose-send">
        <IconButton
          disabled={!props.canAdd}
          icon={<SendIcon size={20} strokeWidth={2.4} />}
          label="Lägg till anteckning"
          onPress={props.onAdd}
          variant="primary"
        />
      </span>
    </div>
  )
}

interface NoteFieldProps {
  /**
   * The id the field's label carries, which names the composer.
   */
  readonly id: string
  /**
   * Adds the note, from the keyboard.
   */
  readonly onAdd: () => void
  /**
   * Called with what is written as it changes.
   */
  readonly onChange: (text: string) => void
  /**
   * Called as the field takes focus, which brings out the tools.
   */
  readonly onOpen: () => void
  /**
   * Whether a note is being sent, which holds the field still, because it is emptied once
   * the note has gone and would take anything typed meanwhile with it. Read-only rather
   * than disabled, so it keeps focus.
   */
  readonly readOnly: boolean
  /**
   * What is written.
   */
  readonly value: string
}

/**
 * The field a note is written in, under a label spoken rather than shown. Enter starts a
 * new line, as a note runs to paragraphs; with Ctrl or Cmd it adds the note, for whoever
 * writes at a keyboard.
 * @param props What is written, and what writing does.
 * @returns The label and the field.
 */
function NoteField(props: NoteFieldProps): ReactElement {
  const { id, onAdd, onChange, onOpen, readOnly, value } = props
  return (
    <>
      <label className="case-compose-label" htmlFor={`${id}-field`} id={id}>
        Ny anteckning
      </label>
      <textarea
        className="case-compose-field"
        id={`${id}-field`}
        name="note"
        onChange={(event) => {
          onChange(event.target.value)
        }}
        onFocus={onOpen}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) {
            return
          }
          event.preventDefault()
          onAdd()
        }}
        placeholder="Skriv en anteckning…"
        readOnly={readOnly}
        rows={1}
        value={value}
      />
    </>
  )
}

/**
 * The field a new note is written in, the pictures that go with it, and under them a row
 * of tools – a picture, who reads the note, and adding it. The row stays out of the way
 * until the field is first used, so a case that is only being read stays calm, and then
 * stays for a run of notes. Who reads the note stays as it was
 * after one is added, because a writer keeping a run of notes to themselves would
 * otherwise have to remember to ask again each time, and the one they forgot would be
 * read by everyone.
 *
 * The note is written first and its pictures follow one by one, each tile showing how it
 * went. A picture that does not arrive stays behind with the note already written, offered
 * to be sent again or let go, so the note is never written twice.
 * @param props The levels on offer, and what adding does.
 * @returns The card.
 */
export function Composer(props: ComposerProps): ReactElement {
  const [draft, setDraft] = useState("")
  const [level, setLevel] = useState<SecrecyLevel>(props.caseLevel)
  const [isOpen, setIsOpen] = useState(false)
  // The note whose pictures did not all arrive, while they wait to be sent again.
  const [stranded, setStranded] = useState<string | undefined>(undefined)
  const pictures = usePictures((noteId) => {
    setDraft("")
    setStranded(noteId)
  })
  const id = useId()
  const files = pictures.chosen.map((item) => item.file)
  const hasUnsent = stranded !== undefined || draft.trim() !== "" || pictures.chosen.length > 0
  const { onUnsentChange } = props
  useEffect(() => {
    onUnsentChange(hasUnsent)
    // Whatever the card held is gone once it is, so the parent is told nothing is left.
    return () => {
      onUnsentChange(false)
    }
  }, [hasUnsent, onUnsentChange])

  if (stranded !== undefined) {
    return (
      <Stranded
        isBusy={props.isBusy}
        onDrop={() => {
          pictures.clear()
          setStranded(undefined)
        }}
        onRetry={() => {
          pictures.retry()
          props.onAttach(stranded, files, pictures.progress)
        }}
        pictures={pictures}
      />
    )
  }

  const options = props.levels.map((candidate) => ({
    label: noteAudience(candidate, props.caseLevel, props.scope),
    value: String(candidate),
  }))
  const canAdd = draft.trim() !== "" && !props.isBusy
  const add = (): void => {
    if (!canAdd) {
      return
    }
    const chosenLevel = level === props.caseLevel ? undefined : level
    props.onAdd(draft.trim(), chosenLevel, files, pictures.progress)
  }

  return (
    <section aria-labelledby={id} className="card case-compose">
      <NoteField
        id={id}
        onAdd={add}
        onChange={setDraft}
        onOpen={() => {
          setIsOpen(true)
        }}
        readOnly={props.isBusy}
        value={draft}
      />
      {pictures.chosen.length > 0 && (
        <ChosenPictures
          chosen={pictures.chosen}
          onRemove={props.isBusy ? undefined : pictures.remove}
        />
      )}
      {pictures.status !== undefined && (
        <p className="case-compose-status" role="status">
          {pictures.status}
        </p>
      )}
      {(isOpen || draft !== "" || pictures.chosen.length > 0) && (
        <Tools
          canAdd={canAdd}
          isAttachDisabled={props.isBusy || pictures.chosen.length >= picturesPerNote}
          level={String(level)}
          onAdd={add}
          onChoose={pictures.choose}
          onLevel={(value) => {
            const next = Number(value)
            if (isSecrecyLevel(next)) {
              setLevel(next)
            }
          }}
          options={options}
        />
      )}
    </section>
  )
}
