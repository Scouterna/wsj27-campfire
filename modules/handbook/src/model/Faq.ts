import type { Block } from "./RichText"

/**
 * What the FAQ is called wherever the handbook names it.
 */
export const faqTitle = "Frågor och svar"

/**
 * The contingent management's mailbox, which the public FAQ names for what it does not
 * answer.
 */
export const supportAddress = "wsj@scouterna.se"

/**
 * The address that starts a mail to the contingent management.
 * @param subject The mail's subject, so the case arrives saying what it is about.
 * @returns The `mailto:` address. The subject is percent-encoded rather than
 * form-encoded, because a mail client shows a form's `+` as a plus rather than a space.
 */
export function supportMail(subject: string): string {
  return `mailto:${supportAddress}?subject=${encodeURIComponent(subject)}`
}

/**
 * One question of the FAQ, with its answer – what the help center calls an article.
 */
export interface FaqQuestion {
  /**
   * The answer, in reading order.
   */
  readonly answer: readonly Block[]
  /**
   * When the question or its answer was last saved, as an ISO 8601 instant in UTC, or
   * undefined when the help center did not say.
   */
  readonly changedAt?: string | undefined
  /**
   * When the question was published, as an ISO 8601 instant in UTC, or undefined when the
   * help center did not say.
   */
  readonly createdAt?: string | undefined
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

/**
 * What is news about a question: that it was published, or that it was saved again, and
 * when.
 */
export type QuestionNews = {
  /**
   * When it happened, as an ISO 8601 instant in UTC.
   */
  readonly at: string
  /**
   * Whether the question is new, or was there before and has changed.
   */
  readonly kind: "changed" | "new"
}

/**
 * How long after publishing a save still belongs to the publishing. An editor often saves
 * a question again within minutes of publishing it, and that is the question being
 * written rather than changed.
 */
const writingMs = 24 * 60 * 60 * 1000

/**
 * When a question was saved again after it was written, if it was.
 * @param question The question.
 * @returns The moment, as an ISO 8601 instant in UTC, or undefined for a question not
 * saved since it was written.
 */
function revisedAt(question: FaqQuestion): string | undefined {
  const { changedAt, createdAt } = question
  if (changedAt === undefined) {
    return undefined
  }
  if (createdAt === undefined) {
    return changedAt
  }
  return new Date(changedAt).getTime() - new Date(createdAt).getTime() > writingMs
    ? changedAt
    : undefined
}

/**
 * What is news about a question since a moment. The help center keeps no note of what
 * changed, so any later save counts – a corrected typo included.
 * @param question The question.
 * @param since The moment after which a change is news, as an ISO 8601 instant in UTC.
 * @returns The news, or undefined when there is none.
 */
export function newsOf(question: FaqQuestion, since: string): QuestionNews | undefined {
  if (question.createdAt !== undefined && question.createdAt > since) {
    return { at: question.createdAt, kind: "new" }
  }
  const revised = revisedAt(question)
  return revised !== undefined && revised > since ? { at: revised, kind: "changed" } : undefined
}

/**
 * When a question last changed, however long ago: when it was saved again after it was
 * written, or else when it was published.
 * @param question The question.
 * @returns The moment and which of the two it was, or undefined when the help center
 * sent neither.
 */
export function datedOf(question: FaqQuestion): QuestionNews | undefined {
  const revised = revisedAt(question)
  if (revised !== undefined) {
    return { at: revised, kind: "changed" }
  }
  return question.createdAt === undefined ? undefined : { at: question.createdAt, kind: "new" }
}

/**
 * When the newest news in a folder happened, since a moment.
 * @param folder The folder.
 * @param since The moment after which a change is news, as an ISO 8601 instant in UTC.
 * @returns The moment, as an ISO 8601 instant in UTC, or undefined when nothing in the
 * folder is news.
 */
export function latestNews(folder: FaqFolder, since: string): string | undefined {
  let latest: string | undefined
  for (const question of folder.questions) {
    const at = newsOf(question, since)?.at
    if (at !== undefined && (latest === undefined || at > latest)) {
      latest = at
    }
  }
  return latest
}
