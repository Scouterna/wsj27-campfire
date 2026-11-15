import type { FaqFolder, FaqQuestion } from "../../model/Faq"
import { toBlocks } from "./html"
import { isRecord } from "./validation"

/**
 * A folder of the help center's knowledge base, as its public JSON sends one.
 */
export interface FolderDto {
  readonly id?: unknown
  readonly name?: unknown
  readonly position?: unknown
  /**
   * Every published article, its answer whole, so one read holds the folder.
   */
  readonly published_articles?: unknown
}

/**
 * One article of a folder, as the help center sends it.
 */
export interface ArticleDto {
  /**
   * When the article was published, as an ISO 8601 moment with the help center's offset.
   */
  readonly created_at?: unknown
  /**
   * The answer, as the HTML the help center's editor wrote.
   */
  readonly description?: unknown
  readonly id?: unknown
  /**
   * When the article was last saved, in the same form as its publishing.
   */
  readonly modified_at?: unknown
  readonly position?: unknown
  readonly title?: unknown
}

/**
 * A folder converted to the FAQ's own, with its questions in the help center's order,
 * or undefined when it is unusable. An article that is unusable is dropped rather than
 * failing the folder, because one broken answer must not hide the others.
 * @param payload The folder's JSON.
 * @returns The folder, or undefined.
 */
export function toFaqFolder(payload: unknown): FaqFolder | undefined {
  if (!isRecord(payload) || !isRecord(payload["folder"])) {
    return undefined
  }
  const folder: FolderDto = payload["folder"]
  if (typeof folder.id !== "number" || typeof folder.name !== "string") {
    return undefined
  }
  const articles = Array.isArray(folder.published_articles) ? folder.published_articles : []
  const questions = articles
    .map((article: unknown) => toPlacedQuestion(article))
    .filter((placed) => placed !== undefined)
    .toSorted((a, b) => a.position - b.position)
    .map((placed) => placed.question)

  return {
    id: folder.id,
    name: folder.name.trim(),
    position: typeof folder.position === "number" ? folder.position : 0,
    questions,
  }
}

/**
 * One article as a question, with its place in the folder for sorting by.
 * @param payload One entry of the folder's `published_articles`.
 * @returns The question and its place, or undefined when it is unusable.
 */
function toPlacedQuestion(
  payload: unknown,
): { readonly position: number; readonly question: FaqQuestion } | undefined {
  if (!isRecord(payload)) {
    return undefined
  }
  const dto: ArticleDto = payload
  if (typeof dto.id !== "number" || typeof dto.title !== "string" || dto.title.trim() === "") {
    return undefined
  }
  return {
    position: typeof dto.position === "number" ? dto.position : 0,
    question: {
      answer: typeof dto.description === "string" ? toBlocks(dto.description) : [],
      changedAt: toInstant(dto.modified_at),
      createdAt: toInstant(dto.created_at),
      id: dto.id,
      title: dto.title.trim(),
    },
  }
}

/**
 * A moment the help center sends, in UTC, so it compares as text with the moments this
 * device writes – the help center writes Swedish time with its offset.
 * @param value The moment as sent.
 * @returns The moment as an ISO 8601 instant in UTC, or undefined when it is not one.
 */
function toInstant(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }
  const moment = new Date(value)
  return Number.isNaN(moment.getTime()) ? undefined : moment.toISOString()
}
