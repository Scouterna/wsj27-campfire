/**
 * Where the CMS edits the handbook: its list of pages, narrowed to one chapter's when a
 * chapter is given. The CMS signs its editors in through the auth service on the same
 * origin, so the address opens straight into the editor for someone signed in to
 * Campfire.
 * @param chapterId The CMS's id for the chapter on screen, or undefined for every page.
 * @returns The origin-relative address.
 */
export function editorAddress(chapterId?: number): string {
  const pages = "/_services/cms/admin/collections/info-page"
  return chapterId === undefined
    ? pages
    : `${pages}?${new URLSearchParams({ "where[chapter][equals]": String(chapterId) }).toString()}`
}
