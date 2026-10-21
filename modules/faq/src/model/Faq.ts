import type { Block } from "./RichText"

/**
 * One question of the FAQ, with its answer – what the help center calls an article.
 */
export interface FaqQuestion {
  /**
   * The answer, in reading order.
   */
  readonly answer: readonly Block[]
  /**
   * The help center's own id for it, which is also its anchor inside its folder.
   */
  readonly id: number
  /**
   * The question, as the help center words it.
   */
  readonly title: string
}

/**
 * A folder of the FAQ – what the contents list, and what a reader opens and reads as one
 * document.
 */
export interface FaqFolder {
  /**
   * The help center's own id for it, which is also its address.
   */
  readonly id: number
  /**
   * What the folder is called.
   */
  readonly name: string
  /**
   * Where the folder sits among the others, lowest first.
   */
  readonly position: number
  /**
   * The folder's questions, in the help center's order.
   */
  readonly questions: readonly FaqQuestion[]
}

/**
 * The folder an address names.
 * @param folders The folders.
 * @param id The folder's id, as the address spells it.
 * @returns The folder, or undefined when no folder has the id.
 */
export function folderAt(folders: readonly FaqFolder[], id: string): FaqFolder | undefined {
  return folders.find((folder) => String(folder.id) === id)
}

/**
 * How many questions there are, in words.
 * @param count The number of questions.
 * @returns The line, such as "5 frågor".
 */
export function questionCount(count: number): string {
  return `${String(count)} ${count === 1 ? "fråga" : "frågor"}`
}
