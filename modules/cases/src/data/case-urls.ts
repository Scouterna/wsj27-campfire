/**
 * Where one case answers.
 * @param caseId The case, encoded because the identifier arrives from the address bar
 * and a reserved character must not rewrite the path.
 * @returns The case's address.
 */
export function caseUrl(caseId: string): string {
  return `/api/project/cases/${encodeURIComponent(caseId)}`
}

/**
 * Where a note's pictures are attached.
 * @param caseId The case the note is on.
 * @param noteId The note the pictures are on.
 * @returns The address a picture is posted to.
 */
export function attachmentsUrl(caseId: string, noteId: string): string {
  return `${caseUrl(caseId)}/notes/${encodeURIComponent(noteId)}/attachments`
}

/**
 * Where one picture on a note is read, in full or as its thumbnail. An image element
 * reads it, carrying the session's cookie as every other request to the origin does.
 * @param caseId The case the note is on.
 * @param noteId The note the picture is on.
 * @param attachmentId The picture, by the service's identifier.
 * @param isThumbnail Whether to read the thumbnail rather than the picture.
 * @returns The picture's address.
 */
export function attachmentUrl(
  caseId: string,
  noteId: string,
  attachmentId: string,
  isThumbnail: boolean,
): string {
  const url = `${attachmentsUrl(caseId, noteId)}/${encodeURIComponent(attachmentId)}`
  return isThumbnail ? `${url}?thumbnail=true` : url
}
