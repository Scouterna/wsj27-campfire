// The CalVer arithmetic behind a release: parsing and formatting `YEAR.FEATURE.PATCH`,
// and the one rule for how far a set of commit subjects moves a version. It is pure,
// with no git and no file system, so the rule is tested on its own and every caller
// applies it the same way.

/**
 * How far a set of commits moves a version.
 */
export type Bump = "feature" | "none" | "patch"

/**
 * A CalVer version, YEAR.FEATURE.PATCH.
 */
export type Version = {
  /**
   * The feature release within the year, bumped by a `feat` or a breaking change.
   */
  readonly feature: number
  /**
   * The patch on that feature release, bumped by a `fix` or a `revert`.
   */
  readonly patch: number
  /**
   * The year of the feature release, which a patch never advances.
   */
  readonly year: number
}

// A Conventional Commits subject as commitlint accepts it here: a type, an optional `!`,
// a colon, and a space. commitlint forbids a scope, so a scoped subject is not matched
// and earns nothing rather than being read as though the scope were absent.
const subjectPattern = /^(\w+)(!)?: /

// Three non-negative integers without leading zeros, so a parsed version formats back
// to exactly the text it came from.
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

/**
 * Returns the bump one commit subject earns.
 * @param subject - The first line of a commit message.
 * @returns `feature` for a `feat` or any breaking `type!`, `patch` for a `fix` or a
 *   `revert`, and `none` for any other type or a subject that is not Conventional.
 */
export function bumpOf(subject: string): Bump {
  const match = subjectPattern.exec(subject)
  if (!match) {
    return "none"
  }
  const [, type, breaking] = match
  if (breaking || type === "feat") {
    return "feature"
  }
  if (type === "fix" || type === "revert") {
    return "patch"
  }
  return "none"
}

/**
 * Orders two versions, for picking the newest tag.
 * @param a - The first version.
 * @param b - The second version.
 * @returns A negative number when `a` is older, a positive one when it is newer, and
 *   zero when the two are equal – the shape `Array.prototype.sort` expects.
 */
export function compareVersions(a: Version, b: Version): number {
  return a.year - b.year || a.feature - b.feature || a.patch - b.patch
}

/**
 * Formats a version as `YEAR.FEATURE.PATCH`.
 * @param version - The version to format.
 * @returns The version as text, the inverse of `parseVersion`.
 */
export function formatVersion(version: Version): string {
  return [version.year, version.feature, version.patch].join(".")
}

/**
 * Returns the version a release of these commits gets.
 * @param input - What the next version is computed from.
 * @param input.last - The last released version, or undefined when there is none yet.
 * @param input.subjects - The subjects of the commits since that release.
 * @param input.year - The current year, which a feature release adopts.
 * @returns The next version, or undefined when no subject earns a release. A first
 *   release, or a feature release in a later year, starts at `<year>.1.0`; a patch stays
 *   on the year of the feature it patches.
 */
export function nextVersion(input: {
  readonly last: Version | undefined
  readonly subjects: readonly string[]
  readonly year: number
}): Version | undefined {
  const { last, subjects, year } = input
  // A feature bump outranks a patch, so the first one settles it.
  let bump: Bump = "none"
  for (const subject of subjects) {
    const earned = bumpOf(subject)
    if (earned === "feature") {
      bump = earned
      break
    }
    if (earned === "patch") {
      bump = earned
    }
  }
  if (bump === "none") {
    return undefined
  }
  if (!last) {
    return { feature: 1, patch: 0, year }
  }
  if (bump === "patch") {
    return { ...last, patch: last.patch + 1 }
  }
  if (year > last.year) {
    return { feature: 1, patch: 0, year }
  }
  return { feature: last.feature + 1, patch: 0, year: last.year }
}

/**
 * Parses a version written as `YEAR.FEATURE.PATCH`.
 * @param text - The text to parse, such as `2026.8.1`, with no `v` prefix.
 * @returns The version, or undefined for anything that is not exactly three
 *   dot-separated non-negative integers without leading zeros.
 */
export function parseVersion(text: string): Version | undefined {
  const match = versionPattern.exec(text)
  if (!match) {
    return undefined
  }
  const [, year, feature, patch] = match
  return { feature: Number(feature), patch: Number(patch), year: Number(year) }
}
