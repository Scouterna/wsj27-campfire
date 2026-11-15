/**
 * Where a leader asks what the handbook and the FAQ do not answer, as the contingent's
 * communication plan has it: the Ledarfrågor forum on the contingent's Discord, which
 * Avdelningssupport watches, for most questions, and the contingent management's mailbox
 * for questions about the leader themself, which do not belong in an open forum.
 */

/**
 * The Ledarfrågor forum. A channel keeps its id when it is renamed, so the link outlives
 * a new name, and this form opens the Discord app where there is one and the browser
 * otherwise. Discord has no link that opens a new post, so the forum is as close as it
 * gets.
 */
export const leaderQuestionsAddress =
  "https://discord.com/channels/1394044380234383512/1567274723157745834"

/**
 * The handbook page that tells a leader how to join the contingent's Discord, for one
 * who has not – a link to the forum then opens Discord on an error, with no word of why.
 */
export const discordGuideSlug = "discord-for-dig-som-ledare"

/**
 * When the first unit leaves Sweden and when the last is home again – the trip, during
 * which questions in Ledarfrågor are answered within hours rather than days.
 */
const trip = {
  end: new Date("2027-08-11T00:00:00+02:00"),
  start: new Date("2027-07-21T00:00:00+02:00"),
} as const

/**
 * How soon a question in Ledarfrågor is answered, as the reader should expect it now.
 * @param now The moment to judge by.
 * @returns The line, such as "Du får svar inom fyra dagar.".
 */
export function replyTime(now: Date): string {
  if (now >= trip.start && now < trip.end) {
    return "Under resan och lägret får du svar inom fyra timmar."
  }
  if (now < trip.start) {
    return "Du får svar inom fyra dagar. Under resan och lägret får du svar inom fyra timmar."
  }
  return "Du får svar inom fyra dagar."
}
