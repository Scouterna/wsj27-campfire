/**
 * What an itinerary item is – what divides travel from a night's sleep from the rest.
 */
export type ItemKind = "activity" | "gathering" | "meal" | "overnight" | "travel"

/**
 * Somewhere the contingent sleeps, gathers, or passes through.
 */
export interface Place {
  /**
   * The city, where the place is in one.
   */
  readonly city?: string
  /**
   * The country, in English as the plan keeps it.
   */
  readonly country?: string
  /**
   * Where it is, for a place the map can draw – both coordinates or neither.
   */
  readonly coordinates?: Coordinates
  /**
   * The place's own name.
   */
  readonly name: string
  /**
   * The IANA zone the place keeps its clocks in, which is what its times are shown in.
   */
  readonly timeZone: string
}

/**
 * A point on the earth.
 */
export interface Coordinates {
  /**
   * Degrees north.
   */
  readonly latitude: number
  /**
   * Degrees east.
   */
  readonly longitude: number
}

/**
 * One stretch of a unit's journey – a bus ride, a night, an afternoon's hike.
 */
export interface ItineraryItem {
  /**
   * The planners' own longer words, where they wrote any.
   */
  readonly description?: string
  /**
   * When it ends; an item covers every moment from its start up to, not including, this.
   */
  readonly end: Date
  /**
   * Where a journey sets off from.
   */
  readonly from?: Place
  /**
   * The item's id in the plan, stable across reads.
   */
  readonly id: string
  /**
   * What kind of item it is.
   */
  readonly kind: ItemKind
  /**
   * How many minutes the updates have moved it, where any has. `start` and `end` already
   * carry the delay; `plannedStart` keeps the time it was planned for.
   */
  readonly delayMinutes?: number
  /**
   * The planners' notes on this item for the unit the journey is for – empty on the plan,
   * filled when a unit's journey is taken out of it.
   */
  readonly notes: readonly string[]
  /**
   * When it was planned to start, before any delay.
   */
  readonly plannedStart: Date
  /**
   * Where it happens, for anything but travel.
   */
  readonly place?: Place
  /**
   * When it starts.
   */
  readonly start: Date
  /**
   * What the planners call it.
   */
  readonly title: string
  /**
   * Where a journey arrives.
   */
  readonly to?: Place
  /**
   * The keys of the units and IST patrols that take part.
   */
  readonly units: readonly string[]
}

/**
 * Somebody in a unit who is not where the unit is for a while.
 */
export interface JourneyException {
  /**
   * When they are back with the unit.
   */
  readonly end: Date
  /**
   * Where they are instead, where the plan knows.
   */
  readonly place?: Place
  /**
   * Why, in the planners' words.
   */
  readonly reason?: string
  /**
   * When they leave the unit's plan.
   */
  readonly start: Date
  /**
   * The planners' name for the exception.
   */
  readonly title: string
  /**
   * The key of the unit they belong to.
   */
  readonly unit: string
}

/**
 * A unit or an IST patrol – whoever moves through the plan together.
 */
export interface Traveller {
  /**
   * Unique across both kinds, since a unit and a patrol share numbers – `avdelning-17`.
   */
  readonly key: string
  /**
   * Whether it is a unit or an IST patrol.
   */
  readonly kind: "avdelning" | "ist"
  /**
   * The name, as the plan has it – "Avdelning 17 · Uttern".
   */
  readonly name: string
  /**
   * The number within its kind.
   */
  readonly number: number
  /**
   * The travel group it moves with, such as "Rundresa Riga – Stockholm".
   */
  readonly travelGroup?: string
}

/**
 * What a kind of update is – a delay moves times, the others only tell.
 */
export type UpdateKind = "change" | "delay" | "info" | "urgent"

/**
 * Something that happened, posted by the planners – a delay, a change, a notice.
 */
export interface Update {
  /**
   * How many minutes a delay moves the items it names.
   */
  readonly delayMinutes?: number
  /**
   * The update's id in the plan.
   */
  readonly id: string
  /**
   * The items a delay moves.
   */
  readonly items: readonly string[]
  /**
   * What kind of update it is.
   */
  readonly kind: UpdateKind
  /**
   * The planners' words, where there are more than the title.
   */
  readonly message?: string
  /**
   * When it was posted.
   */
  readonly posted: Date
  /**
   * The headline.
   */
  readonly title: string
  /**
   * The keys of everyone it concerns.
   */
  readonly units: readonly string[]
}

/**
 * A note for one unit on one item.
 */
export interface UnitNote {
  /**
   * The item's id.
   */
  readonly item: string
  /**
   * The note.
   */
  readonly note: string
  /**
   * The unit's key.
   */
  readonly unit: string
}

/**
 * The whole contingent's plan, with every delay already applied to the items.
 */
export interface Plan {
  readonly exceptions: readonly JourneyException[]
  readonly items: readonly ItineraryItem[]
  readonly notes: readonly UnitNote[]
  readonly travellers: readonly Traveller[]
  readonly updates: readonly Update[]
}

/**
 * One unit's whole journey as the plan stands.
 */
export interface UnitJourney {
  /**
   * The people in the unit who are elsewhere for a while.
   */
  readonly exceptions: readonly JourneyException[]
  /**
   * Every item the unit takes part in, in start order, with the unit's own notes on them.
   */
  readonly items: readonly ItineraryItem[]
  /**
   * Whose journey it is.
   */
  readonly traveller: Traveller
  /**
   * The updates that concern the unit, newest first.
   */
  readonly updates: readonly Update[]
}

/**
 * One unit's or patrol's journey taken out of the plan.
 * @param plan The plan.
 * @param traveller Whose journey.
 * @returns The journey.
 */
export function journeyOf(plan: Plan, traveller: Traveller): UnitJourney {
  const key = traveller.key
  const notes = Map.groupBy(
    plan.notes.filter((note) => note.unit === key),
    (note) => note.item,
  )
  return {
    exceptions: plan.exceptions.filter((exception) => exception.unit === key),
    items: plan.items
      .filter((item) => item.units.includes(key))
      .map((item) => ({
        ...item,
        notes: (notes.get(item.id) ?? []).map((note) => note.note),
      })),
    traveller,
    updates: plan.updates.filter((update) => update.units.includes(key)),
  }
}

/**
 * The items with every delay applied – each moved by the delays that name it, its planned
 * start kept beside.
 * @param items The items as planned.
 * @param updates The updates.
 * @returns The items as they now stand.
 */
export function withDelays(
  items: readonly ItineraryItem[],
  updates: readonly Update[],
): readonly ItineraryItem[] {
  const minutes = new Map<string, number>()
  for (const update of updates) {
    if (update.kind !== "delay" || update.delayMinutes === undefined) {
      continue
    }
    for (const id of update.items) {
      minutes.set(id, (minutes.get(id) ?? 0) + update.delayMinutes)
    }
  }
  return items.map((item) => {
    const delay = minutes.get(item.id)
    if (delay === undefined || delay === 0) {
      return item
    }
    const shift = delay * 60_000
    return {
      ...item,
      delayMinutes: delay,
      end: new Date(item.end.getTime() + shift),
      start: new Date(item.start.getTime() + shift),
    }
  })
}

/**
 * Where a unit is at one moment – what it is doing, where it sleeps, and what comes next.
 */
export interface Whereabouts {
  /**
   * Everything but a night that covers the moment.
   */
  readonly doing: readonly ItineraryItem[]
  /**
   * The first item that starts after the moment, other than a night.
   */
  readonly next?: ItineraryItem
  /**
   * The night that covers the moment, or failing that the one that starts within a day of
   * it – "tonight".
   */
  readonly sleeping?: ItineraryItem
}

const day = 24 * 60 * 60 * 1000

/**
 * Whether an item covers a moment.
 * @param item The item.
 * @param at The moment.
 * @returns True from the item's start up to, not including, its end.
 */
export function isCovering(item: ItineraryItem, at: Date): boolean {
  return item.start <= at && at < item.end
}

/**
 * Where a unit is at a moment, read off its itinerary.
 * @param items The unit's items, in start order.
 * @param at The moment asked about.
 * @returns What covers the moment, where the unit sleeps, and what is next.
 */
export function whereabouts(items: readonly ItineraryItem[], at: Date): Whereabouts {
  const nights = items.filter((item) => item.kind === "overnight")
  const rest = items.filter((item) => item.kind !== "overnight")
  const sleeping =
    nights.find((night) => isCovering(night, at)) ??
    nights.find((night) => night.start > at && night.start.getTime() - at.getTime() < day)
  const next = rest.find((item) => item.start > at)
  return {
    doing: rest.filter((item) => isCovering(item, at)),
    ...(next !== undefined && { next }),
    ...(sleeping !== undefined && { sleeping }),
  }
}

/**
 * The zone an item's times are shown in – where it happens, or where a journey sets off.
 * @param item The item.
 * @returns An IANA zone, Swedish where the plan names no place.
 */
export function zoneOf(item: ItineraryItem): string {
  return (item.place ?? item.from ?? item.to)?.timeZone ?? "Europe/Stockholm"
}

/**
 * Where a unit is on the map at a moment.
 */
export interface Position extends Coordinates {
  /**
   * Whether the unit is between two places – on a bus or a ferry – rather than at one.
   */
  readonly isMoving: boolean
}

/**
 * One stop the route passes, at the moment it is reached.
 */
export interface RoutePoint extends Coordinates {
  /**
   * When the route reaches the point.
   */
  readonly at: Date
}

/**
 * The route through every place the itinerary names, in order – where a journey starts and
 * ends, and where everything else happens – without a point repeated back to back.
 * @param items The unit's items, in start order.
 * @returns The points, in the order the unit reaches them.
 */
export function route(items: readonly ItineraryItem[]): readonly RoutePoint[] {
  const points: RoutePoint[] = []
  const push = (place: Place | undefined, at: Date): void => {
    const where = place?.coordinates
    if (where === undefined) {
      return
    }
    const last = points.at(-1)
    if (last?.latitude === where.latitude && last.longitude === where.longitude) {
      return
    }
    points.push({ ...where, at })
  }
  for (const item of items) {
    if (item.kind === "travel") {
      push(item.from, item.start)
      push(item.to, item.end)
    } else {
      push(item.place, item.start)
    }
  }
  return points
}

/**
 * Where the unit is at a moment. On a journey with both ends on the map it is placed
 * along the straight line between them, as far as the time has come – an estimate, since
 * no bus reports where it is. Otherwise it is at the place of what covers the moment, or
 * at the last place it reached, or before the journey at the first.
 * @param items The unit's items, in start order.
 * @param at The moment.
 * @returns The position, or undefined when no item names a place on the map.
 */
export function positionAt(items: readonly ItineraryItem[], at: Date): Position | undefined {
  for (const item of items) {
    const from = item.from?.coordinates
    const to = item.to?.coordinates
    if (item.kind === "travel" && isCovering(item, at) && from !== undefined && to !== undefined) {
      const share =
        (at.getTime() - item.start.getTime()) / (item.end.getTime() - item.start.getTime())
      return {
        isMoving: true,
        latitude: from.latitude + (to.latitude - from.latitude) * share,
        longitude: from.longitude + (to.longitude - from.longitude) * share,
      }
    }
  }
  const points = route(items)
  const reached = points.findLast((point) => point.at <= at) ?? points[0]
  return reached === undefined
    ? undefined
    : { isMoving: false, latitude: reached.latitude, longitude: reached.longitude }
}

/**
 * Where a unit is at a moment, as the overview groups it – the same label for every unit in
 * the same place, and where to put them on the map.
 */
export interface Location {
  /**
   * What the unit is doing, where anything covers the moment.
   */
  readonly doing?: string
  /**
   * The place, or the journey under way – "Rigas skolförläggning", or "På väg: Riga →
   * Vilnius" – and "Inte avrest" or "Hemma" outside the trip.
   */
  readonly label: string
  /**
   * Where on the map, where the plan knows.
   */
  readonly position?: Position
}

/**
 * Where a unit is at a moment, for the overview.
 * @param items The unit's items, in start order.
 * @param at The moment.
 * @returns The location.
 */
export function locate(items: readonly ItineraryItem[], at: Date): Location {
  const first = items[0]
  const last = items.at(-1)
  if (first === undefined || last === undefined || at < first.start) {
    return { label: "Inte avrest" }
  }
  if (at >= last.end) {
    return { label: "Hemma" }
  }
  const position = positionAt(items, at)
  const covering = items.filter((item) => isCovering(item, at))
  const travel = covering.find((item) => item.kind === "travel")
  const activity = covering.find((item) => item.kind !== "travel" && item.kind !== "overnight")
  const night = covering.find((item) => item.kind === "overnight")
  const doing = (travel ?? activity ?? night)?.title
  const where =
    travel === undefined
      ? (activity ?? night)?.place?.name
      : `På väg: ${travel.from?.city ?? travel.from?.name ?? "?"} → ${travel.to?.city ?? travel.to?.name ?? "?"}`
  const reached = items.findLast((item) => item.end <= at)
  return {
    ...(doing !== undefined && { doing }),
    label: where ?? reached?.to?.name ?? reached?.place?.name ?? "Mellan två ställen",
    ...(position !== undefined && { position }),
  }
}
