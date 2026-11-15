/**
 * Where the CMS edits the handbook: one page's own editor when a page is given, and the
 * list of every page otherwise. The CMS signs its editors in through the auth service on
 * the same origin, so the address opens straight into the editor for someone signed in
 * to Campfire.
 * @param pageId The CMS's id for the page to edit, or undefined for the list of pages.
 * @returns The origin-relative address.
 */
export function editorAddress(pageId?: number): string {
  const pages = "/services/cms/admin/collections/info-page"
  return pageId === undefined ? pages : `${pages}/${String(pageId)}`
}
