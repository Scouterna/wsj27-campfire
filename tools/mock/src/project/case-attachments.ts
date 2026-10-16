import type { Context } from "hono"
import sharp from "sharp"

import {
  answer,
  detail,
  fieldError,
  invalid,
  isTrue,
  pathInteger,
  queryField,
  type FieldError,
} from "../pydantic.ts"
import { canReadNote, type Person } from "./case-access.ts"
import { solveCase, storable, type Service } from "./case-dependencies.ts"
import { attachmentJson, type CaseRecord, type NoteRecord } from "./case-store.ts"

/**
 * The pictures on a note, as `case.py` keeps them: re-encoded as a JPEG on arrival, which also
 * drops the EXIF, and stored beside a thumbnail. Pillow does the work there and sharp here, so a
 * picture's bytes differ from the service's while its size, its orientation, and every answer
 * around it do not.
 */

// What the service reads of an upload before refusing it, and how many a note can carry.
const maximumBytes = 20 * 1024 * 1024
const picturesPerNote = 10

// Pillow refuses a picture of more than twice its pixel limit as a decompression bomb.
const pixelLimit = 2 * 50_000_000

const formats = new Set(["jpeg", "png", "webp"])

/**
 * A picture as the service stores it.
 */
interface Processed {
  readonly height: number
  readonly picture: Uint8Array
  readonly thumbnail: Uint8Array
  readonly width: number
}

// Of the whole numbers either side of an exact side, the one a distance prefers – the lower on
// a tie, as Python's min() keeps the first – and never under a pixel.
function closest(exact: number, distance: (candidate: number) => number): number {
  const [low, high] = [Math.floor(exact), Math.ceil(exact)]
  return Math.max(distance(high) < distance(low) ? high : low, 1)
}

/**
 * The size Pillow's `thumbnail` shrinks a picture to so it fits a square box: the side that
 * overflows becomes the box's, and the other is whichever of the two whole numbers around its
 * exact value keeps the aspect closer, never under a pixel. A picture that already fits keeps
 * its size.
 * @param width The picture's width.
 * @param height The picture's height.
 * @param box The box's side.
 * @returns The new width and height.
 */
function fitted(width: number, height: number, box: number): readonly [number, number] {
  if (box >= width && box >= height) {
    return [width, height]
  }
  const aspect = width / height
  return aspect <= 1
    ? [closest(box * aspect, (candidate) => Math.abs(aspect - candidate / box)), box]
    : [
        box,
        closest(box / aspect, (candidate) =>
          candidate === 0 ? 0 : Math.abs(aspect - box / candidate),
        ),
      ]
}

/**
 * `_process_picture`: the picture turned upright, then shrunk to fit 2048 pixels either way and
 * saved as a JPEG, and that shrunk again to fit 320 for the thumbnail.
 * @param data What was uploaded.
 * @returns The stored picture, or undefined when the upload is no JPEG, PNG, or WebP picture.
 */
async function processPicture(data: Uint8Array): Promise<Processed | undefined> {
  try {
    const source = sharp(data, { limitInputPixels: pixelLimit })
    const { format } = await source.metadata()
    if (!formats.has(format)) {
      return undefined
    }
    const upright = await source.rotate().toBuffer({ resolveWithObject: true })
    const [width, height] = fitted(upright.info.width, upright.info.height, 2048)
    const picture = await sharp(upright.data)
      .resize(width, height, { fit: "fill" })
      .jpeg({ quality: 85 })
      .toBuffer()
    const [thumbnailWidth, thumbnailHeight] = fitted(width, height, 320)
    const thumbnail = await sharp(picture)
      .resize(thumbnailWidth, thumbnailHeight, { fit: "fill" })
      .jpeg({ quality: 80 })
      .toBuffer()
    return { height, picture, thumbnail, width }
  } catch {
    return undefined
  }
}

/**
 * `_readable_note`: the note, if it is on this case and the caller may read it.
 * @param service The store.
 * @param caller The caller.
 * @param record The case.
 * @param noteId The note's id from the path.
 * @returns The note, or undefined for the 404 the service answers.
 */
function readableNote(
  service: Service,
  caller: Person,
  record: CaseRecord,
  noteId: bigint,
): NoteRecord | undefined {
  storable(noteId)
  const note = service.store.findNote(BigInt(record.id), noteId)
  return note !== undefined && canReadNote(caller, record, note) ? note : undefined
}

// The form's `file`, which FastAPI requires to be an upload rather than a plain field.
function uploaded(form: FormData, errors: FieldError[]): File | undefined {
  const file = form.get("file")
  if (file === null) {
    errors.push(fieldError("missing", ["body", "file"], "Field required", undefined))
    return undefined
  }
  if (typeof file === "string") {
    const message = "Value error, Expected UploadFile, received: <class 'str'>"
    errors.push(fieldError("value_error", ["body", "file"], message, file, { error: new Map() }))
    return undefined
  }
  return file
}

/**
 * `POST /cases/{case_id}/notes/{note_id}/attachments`: attaches one picture to a note its
 * author wrote, on an open case.
 * @param service The store and the clock.
 * @param context The request.
 * @param caller The caller.
 * @param form The multipart form.
 * @returns The stored attachment with 201, or the service's refusal.
 */
export async function addAttachment(
  service: Service,
  context: Context,
  caller: Person,
  form: FormData,
): Promise<Response> {
  const solved = solveCase(service, context, caller, true)
  if (solved instanceof Response) {
    return solved
  }
  const { errors, record } = solved
  pathInteger(context, "caseId", "case_id", errors)
  const noteId = pathInteger(context, "noteId", "note_id", errors)
  const file = uploaded(form, errors)
  if (record === undefined || file === undefined || errors.length > 0) {
    return invalid(context, errors)
  }
  const note = readableNote(service, caller, record, noteId)
  if (note === undefined) {
    return detail(context, "Note not found", 404)
  }
  if (note.creatorId !== caller.userId()) {
    return detail(context, "Only the note's author may attach to it", 403)
  }
  const data = new Uint8Array(await file.arrayBuffer())
  if (data.byteLength > maximumBytes) {
    return detail(context, "Larger than 20 MB", 413)
  }
  if (service.store.attachmentsOf(note).length >= picturesPerNote) {
    return detail(context, "A note can have at most 10 pictures", 409)
  }
  const processed = await processPicture(data)
  if (processed === undefined) {
    return detail(context, "Only JPEG, PNG and WebP pictures can be attached", 422)
  }
  const creatorId = caller.userId()
  storable(creatorId, file.name)
  const attachment = service.store.addAttachment(note, {
    ...processed,
    createdAt: service.now(),
    creatorId,
    filename: file.name,
  })
  return answer(context, attachmentJson(attachment), 201)
}

/**
 * `GET /cases/{case_id}/notes/{note_id}/attachments/{attachment_id}`: a picture, or with
 * `thumbnail=true` its thumbnail, for whoever may read its note, on a closed case too.
 * @param service The store.
 * @param context The request.
 * @param caller The caller.
 * @returns The JPEG, or the service's refusal.
 */
export function readAttachment(service: Service, context: Context, caller: Person): Response {
  const solved = solveCase(service, context, caller, false)
  if (solved instanceof Response) {
    return solved
  }
  const { errors, record } = solved
  pathInteger(context, "caseId", "case_id", errors)
  const noteId = pathInteger(context, "noteId", "note_id", errors)
  const attachmentId = pathInteger(context, "attachmentId", "attachment_id", errors)
  const isThumbnail = queryField(context, "thumbnail", errors, isTrue) ?? false
  if (record === undefined || errors.length > 0) {
    return invalid(context, errors)
  }
  const note = readableNote(service, caller, record, noteId)
  if (note === undefined) {
    return detail(context, "Note not found", 404)
  }
  storable(attachmentId)
  const attachment = service.store.findAttachment(note.id, attachmentId)
  if (attachment === undefined) {
    return detail(context, "Attachment not found", 404)
  }
  // The service asks for a year in the browser's cache, but its middleware replaces every
  // response's Cache-Control with no-store, which the mock's own copy of it does here too.
  const bytes = isThumbnail ? attachment.thumbnail : attachment.picture
  return context.body(new Uint8Array(bytes), 200, {
    "Cache-Control": "private, max-age=31536000, immutable",
    "Content-Type": "image/jpeg",
  })
}
