import { QueryClient } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

import { fetchMaterialQuery, materialFolder } from "./fetch-material"

const folderMime = "application/vnd.google-apps.folder"
const png = "image/png"

/**
 * The folder a listing asks about, read from its query.
 * @param url The listing's address.
 * @returns The parent folder's id, or an empty string.
 */
function parentOf(url: string): string {
  const query = new URL(url).searchParams.get("q") ?? ""
  return /'([^']+)' in parents/u.exec(query)?.[1] ?? ""
}

/**
 * Stands in for the platform's `fetch`, answering each folder's listing from its own
 * entries and a folder it was not given as a refusal.
 * @param folders The entries per parent folder id.
 * @returns The addresses asked for, in order.
 */
function driveAnswers(folders: Readonly<Record<string, readonly object[]>>): readonly string[] {
  const asked: string[] = []
  const entries = new Map(Object.entries(folders))
  vi.stubGlobal("fetch", (url: string): Promise<Response> => {
    asked.push(url)
    const files = entries.get(parentOf(url))
    return Promise.resolve(
      files === undefined ? new Response("no", { status: 403 }) : Response.json({ files }),
    )
  })
  return asked
}

/**
 * A fresh query client per test, so no answer cached by one test leaks into the next.
 * @returns The client.
 */
function testClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("reading the material", () => {
  it("walks every folder under the material's own", async () => {
    driveAnswers({
      [materialFolder]: [{ id: "symbols", mimeType: folderMime, name: "Avdelningssymboler" }],
      symbols: [{ id: "a", mimeType: png, name: "ugglan.png", size: "2457" }],
    })

    const tree = await testClient().query(fetchMaterialQuery())

    expect(tree).toMatchObject([
      {
        children: [{ id: "a", kind: "file", name: "ugglan.png", size: 2457 }],
        id: "symbols",
        kind: "folder",
        name: "Avdelningssymboler",
      },
    ])
  })

  it("asks Drive for the shared drive the folder lives on", async () => {
    // Without these the answer is a silent, successful empty list.
    const asked = driveAnswers({ [materialFolder]: [] })

    await testClient().query(fetchMaterialQuery())

    const query = new URL(asked[0] ?? "").searchParams
    expect(query.get("supportsAllDrives")).toBe("true")
    expect(query.get("includeItemsFromAllDrives")).toBe("true")
    expect(query.get("q")).toBe(`'${materialFolder}' in parents and trashed = false`)
  })

  it("puts each folder's children in reading order", async () => {
    driveAnswers({
      [materialFolder]: [
        { id: "1", mimeType: png, name: "ärlig.png" },
        { id: "2", mimeType: folderMime, name: "Mallar" },
      ],
      "2": [],
    })

    const tree = await testClient().query(fetchMaterialQuery())

    expect(tree.map((node) => node.name)).toEqual(["Mallar", "ärlig.png"])
  })

  it("drops an entry that does not convert and keeps the rest", async () => {
    driveAnswers({ [materialFolder]: [{ id: 7 }, { id: "b", mimeType: png, name: "b.png" }] })

    const tree = await testClient().query(fetchMaterialQuery())

    expect(tree.map((node) => node.name)).toEqual(["b.png"])
  })

  it("follows the pages until the listing stops", async () => {
    const pages = [
      { files: [{ id: "a", mimeType: png, name: "one.png" }], nextPageToken: "more" },
      { files: [{ id: "b", mimeType: png, name: "two.png" }] },
    ]
    const asked: string[] = []
    vi.stubGlobal("fetch", (url: string): Promise<Response> => {
      asked.push(url)
      return Promise.resolve(Response.json(pages[asked.length - 1]))
    })

    const tree = await testClient().query(fetchMaterialQuery())

    expect(tree.map((node) => node.name)).toEqual(["one.png", "two.png"])
    expect(new URL(asked[1] ?? "").searchParams.get("pageToken")).toBe("more")
  })

  it("fails the whole read when one folder cannot be listed", async () => {
    // A tree missing a branch looks complete to whoever reads it.
    driveAnswers({ [materialFolder]: [{ id: "x", mimeType: folderMime, name: "Mapp" }] })

    await expect(testClient().query(fetchMaterialQuery())).rejects.toThrow("403")
  })
})
