/**
 * One file in the contingent's material – a symbol, a template, a font, a document.
 */
export interface MaterialFile {
  /**
   * Where the file's bytes are downloaded from, straight from Drive, so the application
   * never holds them.
   */
  readonly downloadUrl: string
  /**
   * The Drive id, unique across the whole material.
   */
  readonly id: string
  /**
   * Which of the two a node is, so a list of them narrows without a type guard.
   */
  readonly kind: "file"
  /**
   * The media type Drive reports, which says what the file is more reliably than the
   * extension somebody typed.
   */
  readonly mimeType: string
  /**
   * The file's name as it was uploaded, extension included, composed so it compares
   * equal to the same word typed anywhere else.
   */
  readonly name: string
  /**
   * Where Drive renders a large picture of the file, for its preview.
   */
  readonly pictureUrl: string
  /**
   * The size in bytes, or zero where Drive reported none.
   */
  readonly size: number
  /**
   * Where Drive renders a small picture of the file, which it does for documents and
   * templates as well as images.
   */
  readonly thumbnailUrl: string
  /**
   * Where the file opens in Drive's own viewer, for a document whose picture shows only
   * its first page.
   */
  readonly viewerUrl: string
}

/**
 * One folder, and everything under it.
 */
export interface MaterialFolder {
  /**
   * What the folder holds, folders first and then files, each in Swedish alphabetical
   * order.
   */
  readonly children: readonly MaterialNode[]
  /**
   * The Drive id, which is what the folder's address carries.
   */
  readonly id: string
  /**
   * Which of the two a node is.
   */
  readonly kind: "folder"
  /**
   * The folder's name, composed like a file's.
   */
  readonly name: string
}

/**
 * A node of the material tree: a folder, or a file inside one.
 */
export type MaterialNode = MaterialFile | MaterialFolder
