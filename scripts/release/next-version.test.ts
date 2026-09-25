import { spawnSync } from "node:child_process"
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

const here = path.dirname(fileURLToPath(import.meta.url))
const script = path.join(here, "next-version.ts")
const workflow = path.join(here, "..", "..", ".github", "workflows", "release_web.yml")
const thisYear = new Date().getUTCFullYear()
const year = String(thisYear)

// Git exports GIT_DIR and its kin to a hook, so under the pre-push hook an inherited
// environment points every git below at the real repository, whatever `cwd` says –
// and the throwaway commits and tags land on the branch being pushed. Nothing spawned
// here inherits them.
const env = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")),
)

let repo = ""

/**
 * Runs git in the throwaway repository with an identity of its own and without the
 * developer's hooks or signing, so neither a CI runner nor a local config fails it.
 * @param args - The arguments to pass to `git`.
 * @returns What git printed.
 */
function git(...args: string[]): string {
  const isolated = [
    "-c",
    "user.name=Campfire",
    "-c",
    "user.email=campfire@example.com",
    "-c",
    "commit.gpgsign=false",
    "-c",
    "tag.gpgsign=false",
    "-c",
    "core.hooksPath=/dev/null",
  ]
  // The developer's or the runner's own git, as the command under test uses.
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  const result = spawnSync("git", [...isolated, ...args], { cwd: repo, encoding: "utf8", env })
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`)
  }
  return result.stdout.trim()
}

/**
 * Commits a change to each of the given files under a subject.
 * @param subject - The commit's subject.
 * @param files - The repository-relative files to touch.
 */
function commit(subject: string, ...files: string[]): void {
  for (const file of files) {
    const target = path.join(repo, file)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, `${subject}\n`, { flag: "a" })
  }
  git("add", "--all")
  git("commit", "--quiet", "--message", subject)
}

/**
 * Runs the command inside the throwaway repository, or a clone of it.
 * @param artifact - The artifact argument.
 * @param cwd - The repository to run it in, the throwaway one unless given.
 * @returns Its exit status and what it printed.
 */
function nextVersion(artifact: string, cwd = repo): { output: string; status: number | null } {
  const result = spawnSync(process.execPath, [script, artifact], { cwd, encoding: "utf8", env })
  return { output: result.stdout.trim(), status: result.status }
}

beforeEach(() => {
  repo = mkdtempSync(path.join(tmpdir(), "campfire-next-version-"))
  git("init", "--quiet", "--initial-branch=main")
  // The last line of defense: every git call below writes, so refuse to go on unless git
  // resolves to the throwaway repository rather than one the environment points at.
  if (realpathSync(git("rev-parse", "--show-toplevel")) !== realpathSync(repo)) {
    throw new Error(`git does not resolve to the throwaway repository at ${repo}`)
  }
  // The web artifact reads its paths from the real release trigger, so a change to that
  // trigger is exercised here too.
  mkdirSync(path.join(repo, ".github", "workflows"), { recursive: true })
  copyFileSync(workflow, path.join(repo, ".github", "workflows", "release_web.yml"))
  git("add", "--all")
  git("commit", "--quiet", "--message", "chore: start")
})

afterEach(() => {
  rmSync(repo, { force: true, recursive: true })
})

describe("the next version, worked out from a repository", () => {
  it("counts a commit toward the artifacts whose paths it touches, and no others", () => {
    commit("feat: add a shell screen", "apps/android/Screen.kt")

    expect(nextVersion("android").output).toBe(`${year}.1.0`)
    expect(nextVersion("apple").output).toBe("")
    expect(nextVersion("web").output).toBe("")
  })

  it("counts a commit touching both shells toward each", () => {
    commit("fix: share a setting", "apps/android/a.kt", "apps/apple/a.swift")

    expect(nextVersion("android").output).toBe(`${year}.1.0`)
    expect(nextVersion("apple").output).toBe(`${year}.1.0`)
  })

  it("reads the web's paths as the release trigger's globs", () => {
    git("tag", "web-v2026.8.1")
    commit("fix: a deep module file", "modules/participants/src/data/list.ts")
    commit("feat: a nested package manifest", "apps/android/package.json")

    expect(nextVersion("web").output).toBe("2026.8.2")
  })

  it("answers the same on a re-run, and nothing once the version is tagged", () => {
    git("tag", "web-v2026.8.1")
    commit("feat: a screen", "apps/web/src/screen.tsx")

    const earned = thisYear > 2026 ? `${year}.1.0` : "2026.9.0"
    expect(nextVersion("web").output).toBe(earned)
    expect(nextVersion("web").output).toBe(earned)

    git("tag", `web-v${earned}`)
    expect(nextVersion("web")).toEqual({ output: "", status: 0 })
  })

  it("releases nothing from a commit behind the newest release", () => {
    commit("feat: first", "apps/apple/a.swift")
    const behind = git("rev-parse", "HEAD")
    commit("feat: second", "apps/apple/b.swift")
    git("tag", "apple-v2026.1.0")
    git("checkout", "--quiet", behind)

    expect(nextVersion("apple")).toEqual({ output: "", status: 0 })
  })

  it("ignores a tag whose suffix is not a version", () => {
    git("tag", "android-vnext")
    commit("fix: a crash", "apps/android/a.kt")

    expect(nextVersion("android").output).toBe(`${year}.1.0`)
  })

  it("refuses a shallow clone rather than answer as though nothing was released", () => {
    git("tag", "web-v2026.8.1")
    commit("fix: a screen", "apps/web/src/screen.tsx")
    const shallow = mkdtempSync(path.join(tmpdir(), "campfire-next-version-shallow-"))

    try {
      git("clone", "--quiet", "--depth", "1", `file://${repo}`, shallow)

      expect(nextVersion("web", shallow)).toEqual({ output: "", status: 1 })
    } finally {
      rmSync(shallow, { force: true, recursive: true })
    }
  })

  it("refuses an unknown artifact", () => {
    expect(nextVersion("desktop").status).toBe(1)
  })
})
