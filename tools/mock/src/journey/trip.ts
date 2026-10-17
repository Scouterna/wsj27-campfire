import type { AirtableRecord, Tables } from "./airtable.ts"
import { firstLink, links, placeLookup, text, type PlaceJson } from "./fields.ts"

/**
 * The trip base's tables. The base is shaped like the contingent's travel spreadsheet: a
 * unit follows a route out, and its sailing home is its own, because the units of one route
 * go home on different ferries.
 */
export const tripTables = ["Days", "Places", "Routes", "Sailings", "Units", "Updates"] as const

/**
 * One itinerary item as the journey answers it.
 */
interface ItemJson {
  readonly description?: string | undefined
  readonly end: string
  readonly from?: PlaceJson | undefined
  readonly id: string
  readonly kind: "Activity" | "Gathering" | "Overnight" | "Travel"
  readonly place?: PlaceJson | undefined
  readonly start: string
  readonly title: string
  readonly to?: PlaceJson | undefined
  readonly units: readonly string[]
}

/**
 * A unit or the IST as the journey answers it.
 */
interface UnitJson {
  readonly key: string | undefined
  readonly kind: "avdelning" | "ist"
  readonly name: string
  readonly number: unknown
  readonly travel: unknown
  readonly travelGroup: unknown
}

/**
 * An update as the journey answers it.
 */
interface UpdateJson {
  readonly delayMinutes: unknown
  readonly id: string
  readonly items: readonly string[]
  readonly kind: unknown
  readonly message: unknown
  readonly posted: unknown
  readonly title: string
  readonly units: readonly string[]
}

/**
 * The whole plan as `/api/journey/plan` answers it.
 */
export interface TripPlanJson {
  readonly exceptions: readonly never[]
  readonly items: readonly ItemJson[]
  readonly notes: readonly never[]
  readonly units: readonly UnitJson[]
  readonly updates: readonly UpdateJson[]
}

/**
 * The local hours a day's activity and a night cover. The spreadsheet plans by the day, so
 * a day row says what and where but never when.
 */
const hours = { dayEnd: 17, dayStart: 9, nightEnd: 7, nightStart: 21 }

/**
 * The whole plan from the trip base, in the shape the itinerary base answers – a sailing is
 * a journey with a night aboard where it has cabins, and a day row is an activity and a
 * night at the route's places. The base holds no exceptions and no unit notes.
 * @param tables The trip base's tables.
 * @returns The plan.
 */
export function tripPlan(tables: Tables): TripPlanJson {
  const table = (name: (typeof tripTables)[number]): readonly AirtableRecord[] =>
    // eslint-disable-next-line security/detect-object-injection -- one of the base's own table names
    tables[name] ?? []
  const place = placeLookup(table("Places"))
  const routes = new Map(table("Routes").map((route) => [route.id, route.fields]))
  const units = table("Units")
  const keyOf = new Map(units.map((unit) => [unit.id, unitKey(unit.fields)]))
  const unitsOf = (field: unknown): readonly string[] =>
    links(field).flatMap((id) => {
      const key = keyOf.get(id)
      return key === undefined ? [] : [key]
    })
  const unitsOfRoute = groupKeys(units, (unit) => links(unit.fields["Route"]))
  const unitsOfSailing = groupKeys(units, (unit) => [
    ...links(unit.fields["Out"]),
    ...links(unit.fields["Home"]),
  ])
  const items = [
    ...dayItems(table("Days"), place, unitsOfRoute),
    ...table("Sailings").flatMap((sailing) =>
      sailingItems(sailing, place, unitsOfSailing.get(sailing.id) ?? []),
    ),
  ]
  return {
    exceptions: [],
    items: items.toSorted((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id)),
    notes: [],
    units: units
      .map((unit): UnitJson => {
        const route = routes.get(firstLink(unit.fields["Route"]))
        const isIst = unit.fields["Kind"] === "IST"
        const name = text(unit.fields["Name"])
        return {
          key: keyOf.get(unit.id),
          kind: isIst ? "ist" : "avdelning",
          name: isIst ? `IST · ${name}` : `Avdelning ${String(unit.fields["Number"])} · ${name}`,
          number: unit.fields["Number"],
          travel: route?.["Travel"],
          travelGroup: route?.["Name"],
        }
      })
      .toSorted((a, b) => a.kind.localeCompare(b.kind) || Number(a.number) - Number(b.number)),
    updates: table("Updates")
      .map((update) => {
        const sailings = links(update.fields["Sailings"])
        return {
          delayMinutes: update.fields["Delay minutes"],
          id: update.id,
          // A delay to a sailing moves the night aboard with it.
          items: sailings.flatMap((id) => [id, `${id}-night`]),
          kind: update.fields["Kind"],
          message: update.fields["Message"],
          posted: update.fields["Posted"],
          title: text(update.fields["Title"]),
          units: [
            ...new Set([
              ...unitsOf(update.fields["Units"]),
              ...links(update.fields["Routes"]).flatMap((id) => unitsOfRoute.get(id) ?? []),
              ...sailings.flatMap((id) => unitsOfSailing.get(id) ?? []),
            ]),
          ].toSorted((a, b) => a.localeCompare(b)),
        }
      })
      .toSorted((a, b) => String(b.posted).localeCompare(String(a.posted))),
  }
}

/**
 * A unit's key across the plan – `avdelning-17` or `ist-54`.
 * @param fields The unit's fields.
 * @returns The key.
 */
function unitKey(fields: Readonly<Record<string, unknown>>): string {
  return `${fields["Kind"] === "IST" ? "ist" : "avdelning"}-${String(fields["Number"])}`
}

/**
 * The keys of the units under each record a unit links to, in key order.
 * @param units The Units table's records.
 * @param linked The records a unit links to.
 * @returns The unit keys, by linked record id.
 */
function groupKeys(
  units: readonly AirtableRecord[],
  linked: (unit: AirtableRecord) => readonly string[],
): ReadonlyMap<string, readonly string[]> {
  const groups = new Map<string, string[]>()
  for (const unit of units) {
    for (const id of linked(unit)) {
      groups.set(id, [...(groups.get(id) ?? []), unitKey(unit.fields)])
    }
  }
  for (const keys of groups.values()) {
    keys.sort((a, b) => a.localeCompare(b))
  }
  return groups
}

/**
 * The activities and nights the day rows plan. A travel day sets off from where the route
 * slept the night before.
 * @param days The Days table's records.
 * @param place The place lookup.
 * @param unitsOfRoute The unit keys on each route.
 * @returns The items.
 */
function dayItems(
  days: readonly AirtableRecord[],
  place: (field: unknown) => PlaceJson | undefined,
  unitsOfRoute: ReadonlyMap<string, readonly string[]>,
): ItemJson[] {
  const nights = new Map(
    days.map((day) => [
      `${firstLink(day.fields["Route"])} ${text(day.fields["Date"])}`,
      place(day.fields["Night"]),
    ]),
  )
  return days.flatMap((day): ItemJson[] => {
    const route = firstLink(day.fields["Route"])
    const date = text(day.fields["Date"])
    if (date === "") {
      return []
    }
    const units = unitsOfRoute.get(route) ?? []
    const description = text(day.fields["Note"]) || undefined
    const items: ItemJson[] = []
    const title = text(day.fields["Activity"])
    if (title !== "") {
      const kind = activityKind(day.fields["Activity kind"])
      const where = place(day.fields["Activity place"])
      const from = kind === "Travel" ? nights.get(`${route} ${addDays(date, -1)}`) : undefined
      const zone = (where ?? from)?.timeZone ?? "Europe/Stockholm"
      items.push({
        description,
        end: zoned(date, hours.dayEnd, zone),
        id: `${day.id}-day`,
        kind,
        start: zoned(date, hours.dayStart, zone),
        title,
        units,
        ...(kind === "Travel" ? { from, to: where } : { place: where }),
      })
    }
    const night = place(day.fields["Night"])
    if (night !== undefined) {
      items.push({
        description,
        end: zoned(addDays(date, 1), hours.nightEnd, night.timeZone),
        id: `${day.id}-night`,
        kind: "Overnight",
        place: night,
        start: zoned(date, hours.nightStart, night.timeZone),
        title: night.kind === "Jamboree site" ? "Natt på lägret" : `Natt i ${night.name}`,
        units,
      })
    }
    return items
  })
}

/**
 * A day row's activity kind, an activity where the row names none.
 * @param value The field's value.
 * @returns The kind.
 */
function activityKind(value: unknown): "Activity" | "Gathering" | "Travel" {
  return value === "Gathering" || value === "Travel" ? value : "Activity"
}

/**
 * A sailing as a journey, and as a night aboard where it has cabins. A sailing without an
 * arrival time arrives at 07:00 the next morning when it has cabins, and is a moment when it
 * has none, because the operators' sheets give only departures.
 * @param sailing The sailing's record.
 * @param place The place lookup.
 * @param units The keys of the units booked on it.
 * @returns The items, none for a sailing nobody is booked on or that has no departure.
 */
function sailingItems(
  sailing: AirtableRecord,
  place: (field: unknown) => PlaceJson | undefined,
  units: readonly string[],
): ItemJson[] {
  const fields = sailing.fields
  const start = text(fields["Departure"])
  if (units.length === 0 || start === "") {
    return []
  }
  const from = place(fields["From"])
  const to = place(fields["To"])
  const hasCabins = fields["Cabins"] === true
  const arrival = text(fields["Arrival"])
  const toZone = to?.timeZone ?? "Europe/Stockholm"
  const end = arrivalOf(start, arrival, hasCabins, toZone)
  const title = text(fields["Name"])
  const meals = text(fields["Meals"])
  const description = [
    meals === "" ? "" : `Måltider: ${meals}.`,
    hasCabins ? "Hytter för alla." : "Inga hytter.",
    text(fields["Note"]),
  ]
    .filter((line) => line !== "")
    .join(" ")
  const journey: ItemJson = {
    description,
    end,
    from,
    id: sailing.id,
    kind: "Travel",
    start,
    title,
    to,
    units,
  }
  if (!hasCabins) {
    return [journey]
  }
  // The ship has no fixed place on the map, so the night aboard names it without coordinates.
  const aboard: PlaceJson = { name: title, timeZone: from?.timeZone ?? "Europe/Stockholm" }
  return [
    journey,
    {
      end,
      id: `${sailing.id}-night`,
      kind: "Overnight",
      place: aboard,
      start,
      title: "Natt på färjan",
      units,
    },
  ]
}

/**
 * When a sailing arrives – as given, or the next morning for a sailing with cabins, or at
 * its departure for one without.
 * @param start The departure, an ISO timestamp.
 * @param arrival The arrival as the base has it, empty when unknown.
 * @param hasCabins Whether the sailing has cabins.
 * @param toZone The zone of the port it arrives at.
 * @returns The arrival, an ISO timestamp.
 */
function arrivalOf(start: string, arrival: string, hasCabins: boolean, toZone: string): string {
  if (arrival !== "") {
    return arrival
  }
  return hasCabins ? zoned(addDays(localDate(start, toZone), 1), hours.nightEnd, toZone) : start
}

/**
 * A calendar date moved by whole days.
 * @param date The date, `YYYY-MM-DD`.
 * @param days How many days to move it, negative for earlier.
 * @returns The moved date, `YYYY-MM-DD`.
 */
function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

/**
 * The calendar date a moment falls on in a zone.
 * @param moment An ISO timestamp.
 * @param timeZone An IANA zone.
 * @returns The date there, `YYYY-MM-DD`.
 */
function localDate(moment: string, timeZone: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).format(new Date(moment))
}

/**
 * The moment a zone's clocks show a whole hour on a date.
 * @param date The date, `YYYY-MM-DD`.
 * @param hour The hour on the zone's clocks.
 * @param timeZone An IANA zone.
 * @returns The moment, as an ISO timestamp.
 */
function zoned(date: string, hour: number, timeZone: string): string {
  const asIfUtc = Date.parse(`${date}T${String(hour).padStart(2, "0")}:00:00Z`)
  const parts = new Map(
    new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      hour: "numeric",
      hourCycle: "h23",
      minute: "numeric",
      month: "numeric",
      timeZone,
      year: "numeric",
    })
      .formatToParts(asIfUtc)
      .map((part) => [part.type, Number(part.value)]),
  )
  const shown = Date.UTC(
    Number(parts.get("year")),
    Number(parts.get("month")) - 1,
    Number(parts.get("day")),
    Number(parts.get("hour")),
    Number(parts.get("minute")),
  )
  // The zone's offset at that moment; a date across a clock change is off by the change,
  // which no day of the trip is.
  return new Date(asIfUtc - (shown - asIfUtc)).toISOString()
}
