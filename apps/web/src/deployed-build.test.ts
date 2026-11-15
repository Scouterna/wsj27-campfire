import { describe, expect, it } from "vitest"

import { buildOf } from "./deployed-build"

/**
 * A built page of the application around what its head holds.
 * @param head The scripts in its head.
 * @returns The page.
 */
function built(head: string): string {
  return `<!doctype html><html><head><meta name="campfire-version" content="2026.18.0">${head}</head><body><div id="root"></div></body></html>`
}

describe("buildOf", () => {
  it("names a build by its entry script, whatever else the page loads", () => {
    const page = built(`
      <script id="vite-plugin-pwa:register-sw" src="/registerSW.js" defer></script>
      <script type="module" crossorigin src="/assets/index-CINmNYOI.js"></script>
      <link rel="stylesheet" crossorigin href="/assets/index-fKeHeN40.css">`)
    expect(buildOf(page)).toBe("/assets/index-CINmNYOI.js")
  })

  it("tells two builds apart", () => {
    const one = built('<script type="module" src="/assets/index-aaa.js"></script>')
    const two = built('<script src="/assets/index-bbb.js" type="module"></script>')
    expect(buildOf(one)).toBe("/assets/index-aaa.js")
    expect(buildOf(two)).toBe("/assets/index-bbb.js")
  })

  it("names nothing for a page that is not a built page of the application", () => {
    // Another page answering at the address, with a script of its own.
    expect(
      buildOf('<html><head><script type="module" src="/assets/portal.js"></script></head></html>'),
    ).toBeUndefined()
    expect(buildOf("<html><body>Bad gateway</body></html>")).toBeUndefined()
    // The development server's page, whose entry is not a built script.
    expect(buildOf(built('<script type="module" src="/src/main.tsx"></script>'))).toBeUndefined()
    expect(buildOf(built('<script type="module"></script>'))).toBeUndefined()
  })
})
