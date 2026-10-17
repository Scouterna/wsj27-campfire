/**
 * A spike, not a copy of any service: reads the journey plan from an Airtable base, so the
 * Journey screen can be tried against data the contingent edits by hand. The token stays on
 * this side of the origin, because an Airtable token in the browser could rewrite the base.
 */

/**
 * One Airtable record – its id and its fields by name, as the REST API returns them.
 */
export interface AirtableRecord {
  /**
   * The record id, `rec…`, which link fields hold.
   */
  readonly id: string
  /**
   * The fields that have a value; an empty field is absent rather than null.
   */
  readonly fields: Readonly<Record<string, unknown>>
}

/**
 * A base's tables by name, each with every record in it.
 */
export type Tables = Readonly<Record<string, readonly AirtableRecord[] | undefined>>

/**
 * The whole itinerary base, one array per table.
 */
export interface JourneyBase {
  /**
   * The Exceptions table – people who are not where their unit is.
   */
  readonly exceptions: readonly AirtableRecord[]
  /**
   * The Itinerary table.
   */
  readonly items: readonly AirtableRecord[]
  /**
   * The Unit notes table – a note for one unit on one item.
   */
  readonly notes: readonly AirtableRecord[]
  /**
   * The Places table.
   */
  readonly places: readonly AirtableRecord[]
  /**
   * The Travel groups table.
   */
  readonly travelGroups: readonly AirtableRecord[]
  /**
   * The Units table – the units and the IST patrols.
   */
  readonly units: readonly AirtableRecord[]
  /**
   * The Updates table – delays, changes, and notices.
   */
  readonly updates: readonly AirtableRecord[]
}

/**
 * How long a read of a base is reused. Airtable allows five requests a second per base and
 * the whole base is a handful of pages, so a short reuse keeps a busy screen inside the limit
 * while an edit in Airtable still shows within the minute.
 */
const reuseMs = 60_000

/**
 * The last read of each base, by base id, shared by every request.
 */
const cache = new Map<string, { readonly at: number; readonly tables: Promise<Tables> }>()

/**
 * Reads the itinerary base that `AIRTABLE_BASE_ID` names.
 * @param now The clock, in milliseconds.
 * @returns Every record in every table.
 * @throws {Error} When the token or base id is missing, or Airtable refuses.
 */
export async function readBase(now: number): Promise<JourneyBase> {
  const baseId = process.env["AIRTABLE_BASE_ID"]
  if (baseId === undefined) {
    throw new Error("AIRTABLE_BASE_ID is not set")
  }
  const tables = await readTables(
    baseId,
    ["Exceptions", "Itinerary", "Unit notes", "Places", "Travel groups", "Units", "Updates"],
    now,
  )
  return {
    exceptions: tables["Exceptions"] ?? [],
    items: tables["Itinerary"] ?? [],
    notes: tables["Unit notes"] ?? [],
    places: tables["Places"] ?? [],
    travelGroups: tables["Travel groups"] ?? [],
    units: tables["Units"] ?? [],
    updates: tables["Updates"] ?? [],
  }
}

/**
 * Reads the named tables of a base, reusing a read younger than a minute. A failed read is
 * forgotten at once, so the next request asks again rather than serving the failure for a
 * minute.
 * @param baseId The base, `app…`.
 * @param names The tables to read; a base is cached as one read, so every caller of a base
 * asks for the same tables.
 * @param now The clock, in milliseconds.
 * @returns Every record in every table, by table name.
 * @throws {Error} When the token is missing, or Airtable refuses.
 */
export async function readTables(
  baseId: string,
  names: readonly string[],
  now: number,
): Promise<Tables> {
  const entry = cache.get(baseId)
  if (entry !== undefined && now - entry.at <= reuseMs) {
    return entry.tables
  }
  const tables = forgettingFailure(baseId, names)
  cache.set(baseId, { at: now, tables })
  return tables
}

/**
 * Reads the tables, dropping the base from the cache if the read fails.
 * @param baseId The base.
 * @param names The tables.
 * @returns The tables, by name.
 */
async function forgettingFailure(baseId: string, names: readonly string[]): Promise<Tables> {
  try {
    return await fetchTables(baseId, names)
  } catch (error) {
    cache.delete(baseId)
    throw error
  }
}

/**
 * Reads every named table in parallel.
 * @param baseId The base.
 * @param names The tables.
 * @returns The tables, by name.
 */
async function fetchTables(baseId: string, names: readonly string[]): Promise<Tables> {
  const token = process.env["AIRTABLE_TOKEN"] ?? ""
  if (token.length === 0) {
    throw new Error("AIRTABLE_TOKEN is not set")
  }
  return Object.fromEntries(
    await Promise.all(
      names.map(async (name) => [name, await fetchTable(token, baseId, name)] as const),
    ),
  )
}

/**
 * Reads one table, following Airtable's offset through every page of a hundred.
 * @param token The personal access token.
 * @param baseId The base, `app…`.
 * @param table The table's name.
 * @returns Every record in the table.
 */
async function fetchTable(token: string, baseId: string, table: string): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = []
  let offset: string | undefined
  do {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`)
    url.searchParams.set("pageSize", "100")
    if (offset !== undefined) {
      url.searchParams.set("offset", offset)
    }
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) {
      throw new Error(`Airtable answered ${String(response.status)} for ${table}`)
    }
    const page = (await response.json()) as { offset?: string; records: AirtableRecord[] }
    records.push(...page.records)
    offset = page.offset
  } while (offset !== undefined)
  return records
}
