/**
 * A spike, not a copy of any service: reads the journey plan from an Airtable base, so the
 * Journey screen can be tried against data the contingent edits by hand. The token stays on
 * this side of the origin, because an Airtable token in the browser could rewrite the base.
 */

/**
 * One Airtable record – its id and its fields by name, as the REST API returns them.
 */
interface AirtableRecord {
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
 * The whole base, one array per table.
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
 * How long a read of the base is reused. Airtable allows five requests a second per base and
 * the whole base is a handful of pages, so a short reuse keeps a busy screen inside the limit
 * while an edit in Airtable still shows within the minute.
 */
const reuseMs = 60_000

/**
 * The last read of the base, shared by every request.
 */
const cache: { entry?: { readonly at: number; readonly base: Promise<JourneyBase> } | undefined } =
  {}

/**
 * Reads the whole base, reusing a read younger than a minute. A failed read is forgotten at
 * once, so the next request asks again rather than serving the failure for a minute.
 * @param now The clock, in milliseconds.
 * @returns Every record in every table.
 * @throws {Error} When the token or base id is missing, or Airtable refuses.
 */
export async function readBase(now: number): Promise<JourneyBase> {
  if (cache.entry === undefined || now - cache.entry.at > reuseMs) {
    cache.entry = { at: now, base: forgettingFailure() }
  }
  return cache.entry.base
}

/**
 * Reads the base, emptying the cache if the read fails.
 * @returns The base.
 */
async function forgettingFailure(): Promise<JourneyBase> {
  try {
    return await fetchBase()
  } catch (error) {
    cache.entry = undefined
    throw error
  }
}

/**
 * Reads every table in parallel.
 * @returns The base.
 */
async function fetchBase(): Promise<JourneyBase> {
  const token = process.env["AIRTABLE_TOKEN"]
  const baseId = process.env["AIRTABLE_BASE_ID"]
  if (token === undefined || baseId === undefined) {
    throw new Error("AIRTABLE_TOKEN and AIRTABLE_BASE_ID are not set")
  }
  const [exceptions, items, notes, places, travelGroups, units, updates] = await Promise.all(
    ["Exceptions", "Itinerary", "Unit notes", "Places", "Travel groups", "Units", "Updates"].map(
      async (table) => fetchTable(token, baseId, table),
    ),
  )
  return {
    exceptions: exceptions ?? [],
    items: items ?? [],
    notes: notes ?? [],
    places: places ?? [],
    travelGroups: travelGroups ?? [],
    units: units ?? [],
    updates: updates ?? [],
  }
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
