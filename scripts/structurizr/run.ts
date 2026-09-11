// The one pinned way to work with the architecture diagrams. Wraps the Structurizr
// tool so an author never types a raw `docker run`, and a missing prerequisite fails
// with a message that names it rather than a raw error.
//
// Subcommands:
//   layout  – serve Structurizr local on localhost to arrange each view's layout
//   export  – render every view to a self-contained SVG under docs/architecture/diagrams
//   check   – validate the workspace parses, then inspect it for missing descriptions
//             and unlabeled relationships
//
// This is TypeScript rather than a shell script, so it stays cross-platform and a
// Windows developer can run it too. Node 24 strips the types and runs it directly, the
// same way tools/mock runs, so it is checked by tsc and ESLint like the rest of the
// repository rather than falling between them.

import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readdirSync, readFileSync, rmSync, utimesSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(here, "..", "..")
const archDir = path.join(repoRoot, "docs", "architecture")

// The container's data directory, which is also where Structurizr local looks for the
// workspace. Mounting the model here serves every subcommand.
const dataDir = "/usr/local/structurizr"

// The port the layout server listens on. Every port in this repository is coordinated
// by hand rather than left to a default: 3000 is the web application, 3001 the
// guidebook, 3002 Storybook, and this is the next one.
const port = 3003

// The pinned local image, built from the Dockerfile beside this script. The tag carries
// a digest of the Dockerfile, so the build happens once per pinned version: a bumped
// `FROM` line changes the tag, and the next run builds the new image instead of finding
// the old one under a stable name.
const dockerfile = path.join(here, "Dockerfile")
const imageTag = `wsj27-campfire-structurizr:${createHash("sha256")
  .update(readFileSync(dockerfile))
  .digest("hex")
  .slice(0, 12)}`

const dockerMissingMessage =
  "Docker is required to work with the architecture diagrams – install Docker and retry"

/**
 * Run a Docker command and return its exit status. Docker is the only executable this
 * script runs, so a spawn failure means Docker is missing.
 * @param args - The arguments to pass to `docker`.
 * @param options - How to run it.
 * @param options.quiet - Discard the output rather than inheriting stdio, for a probe
 *   whose status is all that matters.
 * @returns The process exit code, or 1 when the process gave none.
 */
function docker(args: string[], { quiet = false }: { quiet?: boolean } = {}): number {
  // Resolving `docker` on PATH is the point: the developer's own installation is what
  // this drives, and there is no fixed location to pin it to across macOS, Linux, and
  // Windows.
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  const result = spawnSync("docker", args, { stdio: quiet ? "ignore" : "inherit" })
  if (result.error) {
    // spawnSync types the failure as a plain Error; the ENOENT that means "no docker on
    // this machine" is on the `code` every Node system error actually carries.
    const error: NodeJS.ErrnoException = result.error
    console.error(
      error.code === "ENOENT" ? dockerMissingMessage : `Failed to run docker: ${error.message}`,
    )
    process.exit(1)
  }
  return result.status ?? 1
}

/**
 * Build the pinned image if it is not already present locally.
 */
function ensureImage(): void {
  if (docker(["image", "inspect", imageTag], { quiet: true }) === 0) {
    return
  }
  console.log(`Building the pinned Structurizr image (${imageTag}) – once per pinned version…`)
  const status = docker(["build", "-t", imageTag, here])
  if (status !== 0) {
    process.exit(status)
  }
}

/**
 * The base `docker run` arguments shared by every subcommand: remove the container on
 * exit, and mount the model into the data directory.
 * @param extra - Extra `docker run` flags (before the image).
 * @returns The full argument list up to and including the image tag.
 */
function dockerRun(extra: string[]): string[] {
  return ["run", "--rm", ...extra, "-v", `${archDir}:${dataDir}`, "-w", dataDir, imageTag]
}

/**
 * Serve Structurizr local so a developer can arrange each view by hand.
 */
function layout(): void {
  // The server re-parses the model only when workspace.dsl itself is newer than its last
  // parse, and never on a change to a file that workspace.dsl includes – which is every
  // file the model is actually written in. Touching the root file on every start is
  // what makes the next page load read the model as it is on disk.
  const now = new Date()
  utimesSync(path.join(archDir, "workspace.dsl"), now, now)

  console.log(
    `Structurizr local is starting on http://localhost:${port.toString()} – press Ctrl+C to stop.`,
  )
  console.log("Open the diagrams, arrange each view, and the layout is saved to workspace.json.")
  // A terminal is attached only when there is one: Docker refuses `-it` on a stdin or
  // a stdout that is not a TTY, which is what an IDE task runner, an agent, or a pipe
  // hands the script, and the server needs no terminal to run or to stop on Ctrl+C.
  const terminal = process.stdin.isTTY && process.stdout.isTTY ? ["-it"] : []
  const status = docker([...dockerRun([...terminal, "-p", `${port.toString()}:8080`]), "local"])
  process.exit(status)
}

/**
 * Render every view to a self-contained SVG, dropping the legend files.
 *
 * The render source is workspace.json, not the DSL: it carries each view's committed
 * layout, so hand-arranged views export as arranged, and it holds a stable
 * last-modified date, so re-exporting an unchanged workspace produces byte-identical
 * images rather than restamping the render time. `local` compiles the DSL into
 * workspace.json, so refresh it there after editing the DSL and before exporting. A
 * checkout with no workspace.json yet falls back to the DSL, which renders every view
 * unarranged.
 */
function exportDiagrams(): void {
  const workspace = existsSync(path.join(archDir, "workspace.json"))
    ? "workspace.json"
    : "workspace.dsl"
  const status = docker([
    ...dockerRun([]),
    "export",
    "-format",
    "svg",
    "-workspace",
    workspace,
    "-output",
    "diagrams",
    "-mode",
    "light",
  ])
  if (status !== 0) {
    process.exit(status)
  }
  // The renderer writes a "<key>-key.svg" legend beside each diagram. The chapters
  // embed only the level diagrams, so the legends are removed to keep exactly one
  // committed SVG per view.
  const diagrams = path.join(archDir, "diagrams")
  for (const file of readdirSync(diagrams)) {
    if (file.endsWith("-key.svg")) {
      rmSync(path.join(diagrams, file))
    }
  }
  console.log(`Exported the view diagrams from ${workspace} to docs/architecture/diagrams/.`)
}

/**
 * Validate the workspace parses, then inspect it for real violations.
 */
function check(): void {
  const validate = docker([...dockerRun([]), "validate", "-workspace", "workspace.dsl"])
  if (validate !== 0) {
    process.exit(validate)
  }
  // The inspect return code is the number of violations *shown*, so the relaxed
  // inspections (severity `ignore`) must be filtered out here or they would count
  // against a clean model. Only `error` and `warning` fail the check; the relaxations
  // are recorded in workspace.dsl.
  const inspect = docker([
    ...dockerRun([]),
    "inspect",
    "-workspace",
    "workspace.dsl",
    "-severity",
    "error,warning",
  ])
  process.exit(inspect)
}

const subcommand = process.argv[2]

// ensureImage() is called inside each real branch rather than above the switch: it
// builds a 6 GB image, and a typo needs Docker no more than the usage line below does.
switch (subcommand) {
  case "layout": {
    ensureImage()
    layout()
    break
  }
  case "export": {
    ensureImage()
    exportDiagrams()
    break
  }
  case "check": {
    ensureImage()
    check()
    break
  }
  default: {
    console.error(`Unknown subcommand: ${subcommand ?? "(none)"}`)
    console.error("Usage: node scripts/structurizr/run.ts <layout|export|check>")
    process.exit(1)
  }
}
