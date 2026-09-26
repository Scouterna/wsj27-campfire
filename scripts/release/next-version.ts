// Prints the version an artifact's next release gets, or nothing when its commits since
// the last release earn none.
//
// The last release is the artifact's newest tag, so git is the only state. A shallow
// clone is refused, because it sees no tags and would answer as though nothing was ever
// released.
//
// The repository is the one the current directory is in, not the one this file sits in,
// so a test can run it inside a throwaway repository.

import { spawnSync, type SpawnSyncReturns } from "node:child_process"

import { type Artifact, artifactSpec } from "./artifacts.ts"
import { compareVersions, formatVersion, nextVersion, parseVersion } from "./version.ts"

const artifacts: readonly Artifact[] = ["android", "apple", "web"]

/**
 * Runs git in the current directory.
 * @param args - The arguments to pass to `git`.
 * @returns The finished process, its output as text.
 */
function runGit(args: readonly string[]): SpawnSyncReturns<string> {
  // Resolving `git` on PATH is the point, because the developer's or the runner's own
  // installation is what this asks, and there is no fixed location to pin it to.
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  return spawnSync("git", args, { encoding: "utf8" })
}

/**
 * Runs git and returns its output, exiting with a message when it fails.
 * @param args - The arguments to pass to `git`.
 * @returns What git printed, without the trailing newline.
 */
function git(args: readonly string[]): string {
  const result = runGit(args)
  if (result.error !== undefined || result.status !== 0) {
    const reason = result.error?.message ?? result.stderr.trim()
    console.error(`git ${args.join(" ")} failed: ${reason}`)
    process.exit(1)
  }
  return result.stdout.trimEnd()
}

/**
 * Tells whether one commit is an ancestor of another, or the same commit.
 * @param ancestor - The commit that may come first.
 * @param descendant - The commit that may come after it.
 * @returns True when `ancestor` is reachable from `descendant`.
 */
function isAncestor(ancestor: string, descendant: string): boolean {
  const result = runGit(["merge-base", "--is-ancestor", ancestor, descendant])
  // 0 and 1 are answers; anything else is git failing to answer.
  if (result.error !== undefined || (result.status !== 0 && result.status !== 1)) {
    console.error(`git merge-base --is-ancestor ${ancestor} ${descendant} failed`)
    process.exit(1)
  }
  return result.status === 0
}

const artifact = artifacts.find((name) => name === process.argv[2])
if (artifact === undefined) {
  console.error(`Usage: next-version <${artifacts.join("|")}>`)
  process.exit(1)
}

if (git(["rev-parse", "--is-shallow-repository"]) === "true") {
  console.error("The repository is a shallow clone; the next version needs its full history")
  process.exit(1)
}

const root = git(["rev-parse", "--show-toplevel"])
const { paths, prefix } = artifactSpec(artifact, root)

// A tag whose suffix is not a version is someone else's business, not a release.
const newest = git(["tag", "--list", `${prefix}*`])
  .split("\n")
  .flatMap((tag) => {
    const version = parseVersion(tag.slice(prefix.length))
    return version === undefined ? [] : [{ tag, version }]
  })
  .toSorted((a, b) => compareVersions(b.version, a.version))
  .at(0)

// A commit that does not descend from the newest release has nothing left to release,
// because re-running an older commit must not cut a version below one that already shipped.
if (newest !== undefined && !isAncestor(newest.tag, "HEAD")) {
  process.exit(0)
}

const range = newest === undefined ? "HEAD" : `${newest.tag}..HEAD`
const log = git(["log", "--format=%s", range, "--", ...paths])
const subjects = log === "" ? [] : log.split("\n")

const next = nextVersion({
  last: newest?.version,
  subjects,
  year: new Date().getUTCFullYear(),
})
if (next !== undefined) {
  console.log(formatVersion(next))
}
