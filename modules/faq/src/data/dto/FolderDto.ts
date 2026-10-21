import type { FaqFolder, FaqQuestion } from "../../model/Faq"
import { toBlocks } from "./html"

/**
 * A folder of the help center's knowledge base, as its public JSON sends one.
 */
export interface FolderDto {
  readonly folder?: {
    readonly id?: unknown
    readonly name?: unknown
    readonly position?: unknown
    /**
     * Every published article, its answer whole, so one read holds the folder.
     */
    readonly published_articles?: unknown
  }
}

/**
 * One article of a folder, as the help center sends it.
 */
export interface ArticleDto {
  /**
   * The answer, as the HTML the help center's editor wrote.
   */
  readonly description?: unknown
  readonly id?: unknown
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
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }
  const { folder } = payload as FolderDto
  if (folder === undefined || typeof folder.id !== "number" || typeof folder.name !== "string") {
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
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }
  const dto = payload as ArticleDto
  if (typeof dto.id !== "number" || typeof dto.title !== "string" || dto.title.trim() === "") {
    return undefined
  }
  return {
    position: typeof dto.position === "number" ? dto.position : 0,
    question: {
      answer: typeof dto.description === "string" ? toBlocks(dto.description) : [],
      id: dto.id,
      title: dto.title.trim(),
    },
  }
}
