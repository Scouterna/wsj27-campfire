/**
 * A folder name that says its files are drawn in white – "Icke-färgade (vita)", "Vit" –
 * matched as whole words, so "Aktiviteter" is not white.
 */
const whiteFolder = /(?:^|[^\p{L}])(?:vit|vita|vitt|icke-färgade?)(?:[^\p{L}]|$)/iu

/**
 * Whether the folders above a file say it was drawn in white, for a dark background.
 * Read from the folders rather than the filename, because the folders are the half of
 * the material that is spelled consistently.
 * @param trail The names of the folders above the file, outermost first.
 * @returns Whether the file is drawn in white.
 */
export function isDrawnWhite(trail: readonly string[]): boolean {
  return trail.some((name) => whiteFolder.test(name))
}
