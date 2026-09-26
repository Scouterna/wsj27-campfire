// The parts of Campfire versioned on their own – the web application and each shell –
// and which commits count toward each one's next version. An artifact is a tag prefix
// and a set of git pathspecs, so the release scripts ask git one question per artifact.
//
// The web's paths are read from the trigger of its release workflow rather than written
// down again here, so the paths that start a release and the paths that decide its
// version are one list and cannot drift apart.

import { readFileSync } from "node:fs"
import path from "node:path"

/**
 * A part of Campfire released under a version of its own.
 */
export type Artifact = "android" | "apple" | "web"

/**
 * An artifact's tag prefix and the git pathspecs whose commits count toward it.
 */
export type ArtifactSpec = {
  /**
   * The git pathspecs whose commits count toward the artifact's next version.
   */
  readonly paths: readonly string[]
  /**
   * What the artifact's tags start with, followed by the version.
   */
  readonly prefix: string
}

/**
 * Resolves an artifact against the repository at `root`.
 * @param artifact - The artifact to resolve.
 * @param root - The repository root, where the web's release workflow is read from.
 * @returns The artifact's tag prefix and pathspecs.
 * @throws {Error} When the web's release workflow has no `on.push.paths` trigger.
 */
export function artifactSpec(artifact: Artifact, root: string): ArtifactSpec {
  switch (artifact) {
    case "android": {
      return { paths: ["apps/android/"], prefix: "android-v" }
    }
    case "apple": {
      return { paths: ["apps/apple/"], prefix: "apple-v" }
    }
    case "web": {
      const workflow = readFileSync(
        path.join(root, ".github", "workflows", "release_web.yml"),
        "utf8",
      )
      // A GitHub path filter is a glob where `**` crosses directories and a bare name
      // matches at the root only. Git's glob magic reads a pattern the same way, where a
      // plain pathspec would treat `**` as two ordinary stars.
      return { paths: triggerPaths(workflow).map((filter) => `:(glob)${filter}`), prefix: "web-v" }
    }
  }
}

/**
 * Extracts `on.push.paths` from a workflow file's text. This reads the block layout
 * Prettier writes – each key on its own line, each list item indented under its key –
 * rather than parsing YAML, so a flow-style list is not found.
 * @param workflow - The workflow file's text.
 * @returns The path filters, unquoted, in the order the file lists them.
 * @throws {Error} When the text has no `on:`, no `push:` under it, no `paths:` under
 *   that, or an empty list.
 */
export function triggerPaths(workflow: string): readonly string[] {
  const lines = workflow
    .split(/\r?\n/)
    .map((line) => ({
      indent: line.length - line.trimStart().length,
      text: withoutComment(line.trim()),
    }))
    .filter((line) => line.text !== "")
  const on = childBlock(lines, "on")
  if (on === undefined) {
    throw new Error("The workflow has no `on:` trigger")
  }
  const push = childBlock(on, "push")
  if (push === undefined) {
    throw new Error("The workflow's trigger has no `push:`")
  }
  const paths = childBlock(push, "paths")
  if (paths === undefined) {
    throw new Error("The workflow's `push:` trigger has no `paths:`")
  }

  const items = paths
    .filter((line) => line.indent === paths[0]?.indent && line.text.startsWith("- "))
    .map((line) => unquote(line.text.slice(2).trim()))
  if (items.length === 0) {
    throw new Error("The workflow's `push:` trigger lists no `paths:`")
  }
  return items
}

/**
 * One meaningful line of a workflow file: its indentation, and its trimmed text without
 * a comment. Blank lines and comments carry no structure, so they are never one.
 */
type Line = {
  /**
   * The number of leading spaces.
   */
  readonly indent: number
  /**
   * The line's text, trimmed and without a trailing comment.
   */
  readonly text: string
}

/**
 * Finds a key among the direct children of a block – the lines at its first line's
 * indentation – and returns the lines nested under that key.
 * @param block - The lines of a block, or of the whole file for the top level.
 * @param key - The key to find, without its colon.
 * @returns The lines nested under the key, or undefined when the block has no such key.
 */
function childBlock(block: readonly Line[], key: string): readonly Line[] | undefined {
  const first = block[0]
  if (first === undefined) {
    return undefined
  }
  const { indent } = first
  const start = block.findIndex(
    (line) => line.indent === indent && [`"${key}":`, `${key}:`, `'${key}':`].includes(line.text),
  )
  if (start === -1) {
    return undefined
  }
  const rest = block.slice(start + 1)
  const end = rest.findIndex((line) => line.indent <= indent)
  return end === -1 ? rest : rest.slice(0, end)
}

/**
 * Removes the quotes around a list item.
 * @param item - The item's text after its dash.
 * @returns The item's value.
 */
function unquote(item: string): string {
  return /^(["']).*\1$/.test(item) ? item.slice(1, -1) : item
}

/**
 * Drops a comment from a trimmed line – the whole line when it starts with `#`, or what
 * follows a `#` after whitespace.
 * @param text - The trimmed line.
 * @returns The text before the comment, trimmed.
 */
function withoutComment(text: string): string {
  if (text.startsWith("#")) {
    return ""
  }
  const comment = text.search(/\s#/)
  return comment === -1 ? text : text.slice(0, comment).trimEnd()
}
