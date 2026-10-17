import { Hono } from "hono"

import { readBase, readTables } from "./airtable.ts"
import { links, placeLookup, text } from "./fields.ts"
import { tripPlan, tripTables } from "./trip.ts"

/**
 * The spike's routes under `/api/journey` – a made-up service, since none exists yet. One
 * route answers the whole plan, with every travel group resolved to the units in it, so the
 * application derives each unit's journey and the contingent's overview from one read.
 *
 * Nothing here checks a session, which a real service would – and a real service would give
 * a leader only their own unit.
 * @param now The clock, in milliseconds.
 * @returns The routes.
 */
export function journeyRoutes(now: () => number): Hono {
  const app = new Hono()

  app.get("/plan", async (context) => {
    // The trip base, shaped like the contingent's travel spreadsheet, wins where it is set.
    const tripBase = process.env["AIRTABLE_TRIP_BASE_ID"]
    if (tripBase !== undefined) {
      const tables = await readTables(tripBase, tripTables, now())
      return context.json(tripPlan(tables))
    }
    const base = await readBase(now())
    const place = placeLookup(base.places)
    const keyOf = new Map(base.units.map((unit) => [unit.id, unitKey(unit.fields)]))
    const unitsOfGroup = new Map<string, string[]>()
    for (const unit of base.units) {
      const unitGroups = links(unit.fields["Travel group"])
      for (const group of unitGroups) {
        unitsOfGroup.set(group, [...(unitsOfGroup.get(group) ?? []), keyOf.get(unit.id) ?? ""])
      }
    }
    const groups = new Map(base.travelGroups.map((group) => [group.id, group.fields]))
    // Sorted, so the same units always answer in the same order.
    const resolve = (unitLinks: unknown, groupLinks: unknown): string[] =>
      [
        ...new Set([
          ...links(unitLinks).map((id) => keyOf.get(id) ?? ""),
          ...links(groupLinks).flatMap((id) => unitsOfGroup.get(id) ?? []),
        ]),
      ].toSorted((a, b) => a.localeCompare(b))
    const itemUnits = new Map(
      base.items.map((item) => [
        item.id,
        resolve(item.fields["Units"], item.fields["Travel groups"]),
      ]),
    )

    return context.json({
      exceptions: base.exceptions.map((exception) => ({
        end: exception.fields["End"],
        place: place(exception.fields["Place"]),
        reason: exception.fields["Reason"],
        start: exception.fields["Start"],
        title: text(exception.fields["Title"]),
        unit: keyOf.get(links(exception.fields["Unit"])[0] ?? ""),
      })),
      items: base.items
        .map((item) => ({
          description: item.fields["Description"],
          end: item.fields["End"],
          from: place(item.fields["From"]),
          id: item.id,
          kind: item.fields["Kind"],
          place: place(item.fields["Place"]),
          start: item.fields["Start"],
          title: text(item.fields["Title"]),
          to: place(item.fields["To"]),
          units: itemUnits.get(item.id) ?? [],
        }))
        .toSorted((a, b) => String(a.start).localeCompare(String(b.start))),
      notes: base.notes.map((note) => ({
        item: links(note.fields["Item"])[0],
        note: note.fields["Note"],
        unit: keyOf.get(links(note.fields["Unit"])[0] ?? ""),
      })),
      units: base.units
        .map((unit) => {
          const group = groups.get(links(unit.fields["Travel group"])[0] ?? "")
          return {
            key: keyOf.get(unit.id),
            kind: unit.fields["Kind"] === "IST-patrull" ? "ist" : "avdelning",
            name: text(unit.fields["Name"]),
            number: unit.fields["Number"],
            travel: group?.["Travel"],
            travelGroup: group?.["Name"],
          }
        })
        .toSorted((a, b) => a.kind.localeCompare(b.kind) || Number(a.number) - Number(b.number)),
      updates: base.updates
        .map((update) => ({
          delayMinutes: update.fields["Delay minutes"],
          id: update.id,
          items: links(update.fields["Items"]),
          kind: update.fields["Kind"],
          message: update.fields["Message"],
          posted: update.fields["Posted"],
          title: text(update.fields["Title"]),
          // Everyone the update names, by unit, by travel group, or through the items it moves.
          units: [
            ...new Set([
              ...resolve(update.fields["Units"], update.fields["Travel groups"]),
              ...links(update.fields["Items"]).flatMap((id) => itemUnits.get(id) ?? []),
            ]),
          ].toSorted((a, b) => a.localeCompare(b)),
        }))
        .toSorted((a, b) => String(b.posted).localeCompare(String(a.posted))),
    })
  })

  return app
}

/**
 * A unit's key across the plan – `avdelning-17` or `ist-3` – since a unit and an IST patrol
 * share numbers.
 * @param fields The unit's fields.
 * @returns The key.
 */
function unitKey(fields: Readonly<Record<string, unknown>>): string {
  const kind = fields["Kind"] === "IST-patrull" ? "ist" : "avdelning"
  return `${kind}-${String(fields["Number"])}`
}
