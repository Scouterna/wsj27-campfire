import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { artifactSpec, triggerPaths } from "./artifacts.ts"

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..")

describe("the paths a workflow's push triggers on", () => {
  it("reads the web's release trigger as it stands", () => {
    const workflow = readFileSync(
      path.join(repoRoot, ".github", "workflows", "release_web.yml"),
      "utf8",
    )

    const paths = triggerPaths(workflow)

    expect(paths).toContain("apps/web/**")
    expect(paths).toContain(".github/workflows/release_web.yml")
  })

  it("unquotes double-quoted, single-quoted, and bare items, and skips comments", () => {
    const workflow = [
      "on:",
      "  push:",
      "    paths:",
      '      - "apps/web/**"',
      "      # a comment between items",
      "",
      "      - 'modules/**'",
      "      - package.json # the root manifest",
      '      - "pnpm-lock.yaml" # quoted, with a comment',
      "  workflow_dispatch:",
      "jobs:",
      "  release:",
      "    paths:",
      "      - not/a/trigger",
    ].join("\n")

    expect(triggerPaths(workflow)).toEqual([
      "apps/web/**",
      "modules/**",
      "package.json",
      "pnpm-lock.yaml",
    ])
  })

  it("takes push's paths and ignores a pull_request list", () => {
    const workflow = [
      "on:",
      "  pull_request:",
      "    paths:",
      '      - "docs/**"',
      "  push:",
      "    branches:",
      "      - main",
      "    paths:",
      '      - "apps/web/**"',
    ].join("\r\n")

    expect(triggerPaths(workflow)).toEqual(["apps/web/**"])
  })

  it("refuses text with no trigger, no push, or no paths", () => {
    expect(() => triggerPaths("name: Release web\n")).toThrow("`on:`")
    expect(() => triggerPaths("on:\n  workflow_dispatch:\n")).toThrow("`push:`")
    expect(() => triggerPaths("on:\n  push:\n")).toThrow("no `paths:`")
    expect(() => triggerPaths("on:\n  push:\n    branches:\n      - main\n")).toThrow("no `paths:`")
  })

  it("refuses a push whose paths list is empty", () => {
    expect(() => triggerPaths("on:\n  push:\n    paths:\n  workflow_dispatch:\n")).toThrow(
      "lists no `paths:`",
    )
  })
})

describe("what each artifact's version counts", () => {
  it("counts each shell's own directory", () => {
    expect(artifactSpec("android", repoRoot)).toEqual({
      paths: ["apps/android/"],
      prefix: "android-v",
    })
    expect(artifactSpec("apple", repoRoot)).toEqual({ paths: ["apps/apple/"], prefix: "apple-v" })
  })

  it("counts the web's release trigger, as glob pathspecs", () => {
    const spec = artifactSpec("web", repoRoot)

    expect(spec.prefix).toBe("web-v")
    expect(spec.paths).toContain(":(glob)apps/web/**")
    for (const pathspec of spec.paths) {
      expect(pathspec.startsWith(":(glob)")).toBe(true)
    }
  })
})
