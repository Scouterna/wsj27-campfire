import type { AirtableRecord } from "./airtable.ts"

/**
 * A place as the journey answers it.
 */
export interface PlaceJson {
  readonly city?: string | undefined
  readonly country?: string | undefined
  readonly kind?: string | undefined
  readonly latitude?: number | undefined
  readonly longitude?: number | undefined
  readonly name: string
  readonly timeZone: string
}

/**
 * A lookup from a link field to the place it names, built once per read of a Places table.
 * @param places The Places table's records.
 * @returns A function from a link field's value to its first place, or undefined when unlinked.
 */
export function placeLookup(
  places: readonly AirtableRecord[],
): (field: unknown) => PlaceJson | undefined {
  const byId = new Map(
    places.map((record) => {
      const fields = record.fields
      const json: PlaceJson = {
        city: fields["City"] as string | undefined,
        country: fields["Country"] as string | undefined,
        kind: fields["Kind"] as string | undefined,
        latitude: fields["Latitude"] as number | undefined,
        longitude: fields["Longitude"] as number | undefined,
        name: text(fields["Name"]),
        // A place nobody gave a zone to is read as Swedish, because that is where the
        // planners are.
        timeZone: (fields["Time zone"] as string | undefined) ?? "Europe/Stockholm",
      }
      return [record.id, json]
    }),
  )
  return (field) => byId.get(firstLink(field))
}

/**
 * The record ids a link field holds.
 * @param value The field's value, absent when nothing is linked.
 * @returns The ids, empty when there are none.
 */
export function links(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []
}

/**
 * The first record id a link field holds.
 * @param value The field's value, absent when nothing is linked.
 * @returns The id, empty when there is none.
 */
export function firstLink(value: unknown): string {
  return links(value)[0] ?? ""
}

/**
 * A text field's value, empty when the field is.
 * @param value The field's value.
 * @returns The text.
 */
export function text(value: unknown): string {
  return typeof value === "string" ? value : ""
}
