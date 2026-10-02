import type { MaterialFile, MaterialFolder, MaterialNode } from "./MaterialNode"

/**
 * A file together with the names of the folders it sits in, outermost first – what a
 * search result needs, because the same name can sit in more than one folder.
 */
export interface LocatedFile {
  /**
   * The file.
   */
  readonly file: MaterialFile
  /**
   * The names of the folders above it, outermost first. Empty for a file at the top.
   */
  readonly trail: readonly string[]
}

/**
 * The nodes in reading order: folders first, then files, each in Swedish alphabetical
 * order, so "Ä" sorts after "Z" rather than beside "A".
 * @param nodes The nodes to order.
 * @returns The same nodes, in reading order.
 */
export function inReadingOrder(nodes: readonly MaterialNode[]): readonly MaterialNode[] {
  return nodes.toSorted(
    (left, right) => rank(left) - rank(right) || left.name.localeCompare(right.name, "sv"),
  )
}

/**
 * Where a node sorts against the other kind.
 * @param node The node to rank.
 * @returns Zero for a folder and one for a file.
 */
function rank(node: MaterialNode): number {
  return node.kind === "folder" ? 0 : 1
}

/**
 * The folders directly inside a list of nodes.
 * @param nodes The nodes to sort through.
 * @returns The folders, in the order they were listed.
 */
export function foldersIn(nodes: readonly MaterialNode[]): readonly MaterialFolder[] {
  return nodes.filter((node) => node.kind === "folder")
}

/**
 * The files directly inside a list of nodes.
 * @param nodes The nodes to sort through.
 * @returns The files, in the order they were listed.
 */
export function filesIn(nodes: readonly MaterialNode[]): readonly MaterialFile[] {
  return nodes.filter((node) => node.kind === "file")
}

/**
 * Every file under a list of nodes, however deep, each with the folders above it.
 * @param nodes The nodes to walk.
 * @param trail The names of the folders already walked through, for the recursion.
 * @returns Every file, depth first.
 */
export function everyFile(
  nodes: readonly MaterialNode[],
  trail: readonly string[] = [],
): readonly LocatedFile[] {
  return nodes.flatMap((node) =>
    node.kind === "file"
      ? [{ file: node, trail }]
      : everyFile(node.children, [...trail, node.name]),
  )
}

/**
 * How many files a folder holds, counting everything under it, so a folder that holds
 * only folders does not read as empty.
 * @param folder The folder to count.
 * @returns The number of files under it.
 */
export function countFiles(folder: MaterialFolder): number {
  return everyFile(folder.children).length
}

/**
 * The folders leading down to one, outermost first and the folder itself last.
 * @param nodes The tree to search.
 * @param id The folder's Drive id.
 * @returns The trail, or an empty list when no folder has that id.
 */
export function trailTo(nodes: readonly MaterialNode[], id: string): readonly MaterialFolder[] {
  for (const node of foldersIn(nodes)) {
    if (node.id === id) {
      return [node]
    }
    const below = trailTo(node.children, id)
    if (below.length > 0) {
      return [node, ...below]
    }
  }
  return []
}

/**
 * Every file whose name or folders match what was typed. Matched word by word, so
 * "ugglan svg" finds the owl's vector files whatever order the words come in, with case
 * and the composition of the letters folded away.
 * @param nodes The tree to search.
 * @param query What the reader typed.
 * @returns The matching files, or an empty list for a query with no words in it.
 */
export function searchFiles(nodes: readonly MaterialNode[], query: string): readonly LocatedFile[] {
  const words = folded(query).split(/\s+/u).filter(Boolean)
  if (words.length === 0) {
    return []
  }
  return everyFile(nodes).filter((located) => {
    const haystack = folded([...located.trail, located.file.name].join(" "))
    return words.every((word) => haystack.includes(word))
  })
}

/**
 * Text as a search compares it – composed and in lowercase.
 * @param text The text to fold.
 * @returns The folded text.
 */
function folded(text: string): string {
  return text.normalize("NFC").toLocaleLowerCase("sv")
}
