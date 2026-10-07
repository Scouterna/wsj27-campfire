import { fetch } from "@scouterna/wsj27-campfire-utils"
import { queryOptions, type UseQueryOptions } from "@tanstack/react-query"

import type { MaterialNode } from "../model/MaterialNode"
import { inReadingOrder } from "../model/tree"
import { toMaterialNode } from "./dto/DriveEntryDto"

/**
 * The folder the contingent keeps its material in, on a shared drive and shared with
 * anyone who has the link, which is what lets it be read with a key and no Google user.
 */
// A Drive id is an address rather than a credential, and only looks random enough to be
// one.
// eslint-disable-next-line no-secrets/no-secrets -- see above
export const materialFolder = "1T4fkM3ApObme4hpS7AKVchCZb_t-TR1F"

/**
 * The browser key the Drive API is called with. It ships in the bundle whatever is done
 * with it, so it is public by construction, and what protects it is the key's own
 * restriction to the Drive API and to Campfire's origins (ADR 038).
 */
// eslint-disable-next-line no-secrets/no-secrets -- public by construction, see above
const apiKey = "AIzaSyDrZdV8Wg1oeDHyzoyQ2eXpc8dka5QA3AA"

/**
 * The key the material is cached under. It is the contingent's, the same for every
 * reader, so the key carries nothing about who is reading.
 */
type MaterialQueryKey = readonly ["material", "tree"]

/**
 * Query options for the contingent's material: the whole folder as one tree, read
 * straight from Google Drive by the browser (ADR 038).
 *
 * A folder that cannot be listed fails the whole read, because a tree missing a branch
 * looks complete to whoever reads it.
 * @returns Options for `useQuery` or `ensureQueryData`.
 */
export function fetchMaterialQuery(): UseQueryOptions<
  readonly MaterialNode[],
  Error,
  readonly MaterialNode[],
  MaterialQueryKey
> {
  return queryOptions({
    queryFn: async (): Promise<readonly MaterialNode[]> => readFolder(materialFolder),
    queryKey: ["material", "tree"] as const,
    // Every material screen reads the tree when it mounts, and one read is a request per
    // folder. Fresh for a few minutes, so walking down the folders does not read the
    // whole tree again at every step, while a file added on Drive still shows on the
    // next visit.
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * A folder's children, and everything under them, in reading order. Each level's
 * subfolders are listed at once rather than one after another, because the API has no
 * recursive listing and the round trips would otherwise add up.
 * @param id The folder's Drive id.
 * @returns The folder's children, as a tree.
 * @throws {Error} When any folder in the tree cannot be listed.
 */
async function readFolder(id: string): Promise<readonly MaterialNode[]> {
  const entries = await listChildren(id)
  const children = await Promise.all(
    entries.map(async (node) =>
      node.kind === "folder" ? { ...node, children: await readFolder(node.id) } : node,
    ),
  )
  return inReadingOrder(children)
}

/**
 * One folder's own entries, following the listing's pages until it stops. An entry
 * that does not convert is dropped, so one bad row does not empty a folder.
 * @param id The folder's Drive id.
 * @returns The entries, folders without their children.
 * @throws {Error} When the API refuses or cannot be reached.
 */
async function listChildren(id: string): Promise<readonly MaterialNode[]> {
  const nodes: MaterialNode[] = []
  let pageToken: string | undefined

  do {
    const page = await fetch<{ readonly files?: unknown; readonly nextPageToken?: unknown }>(
      listUrl(id, pageToken),
    )
    const files: readonly unknown[] = Array.isArray(page.files) ? page.files : []
    for (const row of files) {
      const node = toMaterialNode(row)
      if (node !== undefined) {
        nodes.push(node)
      }
    }
    pageToken = typeof page.nextPageToken === "string" ? page.nextPageToken : undefined
  } while (pageToken !== undefined)

  return nodes
}

/**
 * Where one page of a folder's listing is asked for.
 *
 * The folder is on a shared drive. Without the two shared-drive parameters the query
 * runs against the caller's own Drive, which for a key with no user is empty, and the
 * answer is a successful empty list rather than a refusal.
 * @param id The folder whose children to list.
 * @param pageToken Where to continue from, on any page after the first.
 * @returns The address.
 */
function listUrl(id: string, pageToken: string | undefined): string {
  const query = new URLSearchParams({
    fields: "nextPageToken,files(id,name,mimeType,size)",
    includeItemsFromAllDrives: "true",
    key: apiKey,
    pageSize: "1000",
    q: `'${id}' in parents and trashed = false`,
    supportsAllDrives: "true",
  })
  if (pageToken !== undefined) {
    query.set("pageToken", pageToken)
  }
  return `https://www.googleapis.com/drive/v3/files?${query.toString()}`
}
