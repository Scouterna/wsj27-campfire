import type { ChangeNote, Chapter, HandbookPage } from "../../model/Handbook"
import { toBlocks } from "./LexicalDto"
import { isRecord } from "./validation"

/**
 * One handbook page as the CMS sends it, with its chapter populated. Every field is
 * `unknown`, because the CMS is built and deployed apart from Campfire, and its editors
 * can change the collection's fields without a release here.
 */
export interface InfoPageDto {
  readonly _status?: unknown
  readonly changeNote?: unknown
  readonly changeNoteAt?: unknown
  readonly chapter?: unknown
  readonly content?: unknown
  readonly id?: unknown
  readonly order?: unknown
  readonly position?: unknown
  readonly slug?: unknown
  readonly title?: unknown
}

/**
 * The handbook's pages, from the CMS's paginated answer. A page that cannot be read is
 * dropped rather than failing the whole handbook, because one broken page must not take
 * the others with it.
 * @param value The answer, as the CMS sent it.
 * @returns The pages that could be read, in the order they arrived.
 * @throws {Error} When the answer is not a page listing at all.
 */
export function toHandbookPages(value: unknown): readonly HandbookPage[] {
  if (!isRecord(value) || !Array.isArray(value["docs"])) {
    throw new Error("The handbook answered with something that is not a list of pages")
  }
  return (value["docs"] as unknown[]).flatMap((doc) => {
    const page = isRecord(doc) ? toHandbookPage(doc) : undefined
    return page === undefined ? [] : [page]
  })
}

/**
 * One page, converted.
 * @param dto The page, as the CMS sent it.
 * @returns The page, or undefined when it lacks what a page needs, or is an unpublished
 * draft that reached the answer through an editor's own session.
 */
export function toHandbookPage(dto: InfoPageDto): HandbookPage | undefined {
  const chapter = toChapter(dto.chapter)
  const { id, slug, title } = dto
  if (
    chapter === undefined ||
    dto._status === "draft" ||
    typeof id !== "number" ||
    typeof slug !== "string" ||
    slug === "" ||
    typeof title !== "string"
  ) {
    return undefined
  }
  const position = numberOr(dto.position, numberOr(dto.order, 0))
  const change = toChangeNote(dto.changeNote, dto.changeNoteAt)
  return {
    chapter,
    content: toBlocks(dto.content),
    id,
    position,
    slug,
    title: title.trim(),
    ...(change !== undefined && { change }),
  }
}

/**
 * A page's chapter, which only comes along when the CMS was asked to populate it.
 * @param value The page's `chapter` field.
 * @returns The chapter, or undefined when only its id came along.
 */
function toChapter(value: unknown): Chapter | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const { id, name, slug } = value
  if (
    typeof id !== "number" ||
    typeof name !== "string" ||
    typeof slug !== "string" ||
    slug === ""
  ) {
    return undefined
  }
  return { id, name: name.trim(), order: numberOr(value["order"], 0), slug }
}

/**
 * The change an editor called out, when there is text to show and a moment to date it.
 * @param text The page's `changeNote` field.
 * @param at The page's `changeNoteAt` field.
 * @returns The note, or undefined when either half is missing.
 */
function toChangeNote(text: unknown, at: unknown): ChangeNote | undefined {
  if (typeof text !== "string" || text.trim() === "" || typeof at !== "string") {
    return undefined
  }
  const date = new Date(at)
  return Number.isNaN(date.getTime()) ? undefined : { at: date.toISOString(), text: text.trim() }
}

/**
 * A number, or a fallback for anything else.
 * @param value The untyped value.
 * @param fallback What to use when it is not a finite number.
 * @returns The number.
 */
function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}
