import {
  withDelays,
  type ItemKind,
  type ItineraryItem,
  type JourneyException,
  type Place,
  type Plan,
  type Traveller,
  type UnitNote,
  type Update,
  type UpdateKind,
} from "../../model/Itinerary"

const itemKinds: Readonly<Record<string, ItemKind>> = {
  Activity: "activity",
  Gathering: "gathering",
  Meal: "meal",
  Overnight: "overnight",
  Travel: "travel",
}

const updateKinds: Readonly<Record<string, UpdateKind>> = {
  Change: "change",
  Delay: "delay",
  Info: "info",
  Urgent: "urgent",
}

/**
 * A record, or nothing.
 * @param value Anything from the wire.
 * @returns The value as a record of unknowns, or undefined when it is not an object.
 */
function record(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

/**
 * A string, or nothing – an empty string is nothing too.
 * @param value Anything from the wire.
 * @returns The string, or undefined.
 */
function string(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined
}

/**
 * The strings in a list, or none.
 * @param value Anything from the wire.
 * @returns The strings.
 */
function strings(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : []
}

/**
 * The entries of a list, or none.
 * @param value Anything from the wire.
 * @returns The entries.
 */
function list(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : []
}

/**
 * A moment, or nothing.
 * @param value An ISO timestamp from the wire.
 * @returns The date, or undefined when it does not parse.
 */
function date(value: unknown): Date | undefined {
  const text = string(value)
  if (text === undefined) {
    return undefined
  }
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

/**
 * A place, or nothing.
 * @param value The place from the wire.
 * @returns The place, or undefined without a name.
 */
function toPlace(value: unknown): Place | undefined {
  const json = record(value)
  const name = string(json?.["name"])
  if (json === undefined || name === undefined) {
    return undefined
  }
  const city = string(json["city"])
  const country = string(json["country"])
  const latitude = json["latitude"]
  const longitude = json["longitude"]
  const hasCoordinates = typeof latitude === "number" && typeof longitude === "number"
  return {
    ...(city !== undefined && { city }),
    ...(hasCoordinates && { coordinates: { latitude, longitude } }),
    ...(country !== undefined && { country }),
    name,
    timeZone: string(json["timeZone"]) ?? "Europe/Stockholm",
  }
}

/**
 * One item, or nothing when it lacks a title, a kind, or a time – a half-planned row in the
 * base must not take the whole plan down.
 * @param value The item from the wire.
 * @returns The item, as planned.
 */
function toItem(value: unknown): ItineraryItem | undefined {
  const json = record(value)
  const id = string(json?.["id"])
  const title = string(json?.["title"])
  const kind = itemKinds[string(json?.["kind"]) ?? ""]
  const start = date(json?.["start"])
  const end = date(json?.["end"]) ?? start
  if (
    id === undefined ||
    title === undefined ||
    kind === undefined ||
    start === undefined ||
    end === undefined
  ) {
    return undefined
  }
  const description = string(json?.["description"])
  const place = toPlace(json?.["place"])
  const from = toPlace(json?.["from"])
  const to = toPlace(json?.["to"])
  return {
    ...(description !== undefined && { description }),
    end,
    ...(from !== undefined && { from }),
    id,
    kind,
    notes: [],
    ...(place !== undefined && { place }),
    plannedStart: start,
    start,
    title,
    ...(to !== undefined && { to }),
    units: strings(json?.["units"]),
  }
}

/**
 * One exception, or nothing when it lacks its times or its unit.
 * @param value The exception from the wire.
 * @returns The exception, or undefined.
 */
function toException(value: unknown): JourneyException | undefined {
  const json = record(value)
  const start = date(json?.["start"])
  const end = date(json?.["end"])
  const unit = string(json?.["unit"])
  if (start === undefined || end === undefined || unit === undefined) {
    return undefined
  }
  const place = toPlace(json?.["place"])
  const reason = string(json?.["reason"])
  return {
    end,
    ...(place !== undefined && { place }),
    ...(reason !== undefined && { reason }),
    start,
    title: string(json?.["title"]) ?? "Undantag",
    unit,
  }
}

/**
 * One unit or IST patrol, or nothing without a key and a number.
 * @param value The unit from the wire.
 * @returns The traveller, or undefined.
 */
function toTraveller(value: unknown): Traveller | undefined {
  const json = record(value)
  const key = string(json?.["key"])
  const number = json?.["number"]
  if (key === undefined || typeof number !== "number") {
    return undefined
  }
  const kind = json?.["kind"] === "ist" ? "ist" : "avdelning"
  const travelGroup = string(json?.["travelGroup"])
  return {
    key,
    kind,
    name:
      string(json?.["name"]) ?? `${kind === "ist" ? "IST-patrull" : "Avdelning"} ${String(number)}`,
    number,
    ...(travelGroup !== undefined && { travelGroup }),
  }
}

/**
 * One update, or nothing without a title or a time.
 * @param value The update from the wire.
 * @returns The update, or undefined.
 */
function toUpdate(value: unknown): Update | undefined {
  const json = record(value)
  const id = string(json?.["id"])
  const title = string(json?.["title"])
  const posted = date(json?.["posted"])
  if (id === undefined || title === undefined || posted === undefined) {
    return undefined
  }
  const delayMinutes = json?.["delayMinutes"]
  const message = string(json?.["message"])
  return {
    ...(typeof delayMinutes === "number" && { delayMinutes }),
    id,
    items: strings(json?.["items"]),
    kind: updateKinds[string(json?.["kind"]) ?? ""] ?? "info",
    ...(message !== undefined && { message }),
    posted,
    title,
    units: strings(json?.["units"]),
  }
}

/**
 * One note, or nothing without its item, unit, and words.
 * @param value The note from the wire.
 * @returns The note, or undefined.
 */
function toNote(value: unknown): UnitNote | undefined {
  const json = record(value)
  const item = string(json?.["item"])
  const unit = string(json?.["unit"])
  const note = string(json?.["note"])
  return item === undefined || unit === undefined || note === undefined
    ? undefined
    : { item, note, unit }
}

/**
 * The whole plan from the wire, with every delay applied. A row that does not convert is
 * dropped rather than failing the plan.
 * @param value The body of the plan.
 * @returns The plan.
 */
export function toPlan(value: unknown): Plan {
  const json = record(value)
  const updates = list(json?.["updates"])
    .map((entry) => toUpdate(entry))
    .filter((update) => update !== undefined)
  const items = list(json?.["items"])
    .map((entry) => toItem(entry))
    .filter((item) => item !== undefined)
  return {
    exceptions: list(json?.["exceptions"])
      .map((entry) => toException(entry))
      .filter((exception) => exception !== undefined),
    items: withDelays(items, updates).toSorted((a, b) => a.start.getTime() - b.start.getTime()),
    notes: list(json?.["notes"])
      .map((entry) => toNote(entry))
      .filter((note) => note !== undefined),
    travellers: list(json?.["units"])
      .map((entry) => toTraveller(entry))
      .filter((traveller) => traveller !== undefined),
    updates: updates.toSorted((a, b) => b.posted.getTime() - a.posted.getTime()),
  }
}
