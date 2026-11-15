import { describe, expect, it } from "vitest"

import type { ContentsLine } from "../../model/documents"
import { columnsOf } from "./contents-columns"

/**
 * A page's line, by its title.
 * @param title The title.
 * @returns The line.
 */
function line(title: string): ContentsLine {
  return { anchor: title, level: 2, title }
}

describe("columnsOf", () => {
  const room = { firstHeight: 40, height: 60, width: 220 }

  it("fills a column before starting the next, the first sheet's two being shorter", () => {
    const columns = columnsOf(
      ["a", "b", "c", "d", "e", "f", "g"].map((title) => line(title)),
      room,
    )
    expect(columns.map((column) => column.map((placed) => placed.line.title))).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e", "f", "g"],
    ])
  })

  it("gives a title too long for one row the rows it runs to", () => {
    const [column] = columnsOf([line("a"), line("ett mycket långt namn ".repeat(4))], {
      ...room,
      firstHeight: 200,
    })
    expect(column?.map((placed) => placed.height)).toEqual([18, 44])
  })

  it("lays out nothing for no lines", () => {
    expect(columnsOf([], room)).toEqual([])
  })
})
