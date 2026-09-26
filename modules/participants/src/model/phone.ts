/**
 * Phone numbers as people read them, not as Scoutnet stores them. Scoutnet holds numbers
 * in whatever shape the member typed – "+46708277486", "070-8277486", "070-827 74 86" –
 * and a leader in a field reads the conventional Swedish shape fastest. Formatting is for
 * display only, never what a `tel:` link dials.
 */

// The separators people put in numbers, all of which say nothing about the number.
const separators = /[\s-]/g

/**
 * One number reduced to its dialable core: separators dropped, and the Swedish
 * country code folded into the leading zero it replaces.
 * @param value The number as the record carries it.
 * @returns The digits, with a leading + kept for a foreign number.
 */
function compact(value: string): string {
  const bare = value.replaceAll(separators, "")
  if (bare.startsWith("+46")) {
    return `0${bare.slice(3)}`
  }
  if (bare.startsWith("0046")) {
    return `0${bare.slice(4)}`
  }
  // Any other 00 prefix is a foreign number, so it goes back untouched rather than as a
  // stripped digit blob a later check would mistake for a Swedish one.
  if (bare.startsWith("00")) {
    return value
  }
  return bare
}

/**
 * A phone number in the shape it is read fastest, for display beside a person.
 *
 * A Swedish mobile number comes back in the conventional grouping – "+46708277486"
 * reads "070-827 74 86" – and any other Swedish number with the country code folded
 * away. A number that is not obviously a Swedish one – a foreign number, or something
 * that is not a number at all – comes back exactly as it arrived, because a wrong
 * guess reads worse than an unformatted number.
 * @param value The number as the record carries it.
 * @returns The number as a reader expects to see it.
 */
export function formatPhoneNumber(value: string): string {
  const digits = compact(value)
  if (!/^0\d+$/.test(digits)) {
    return value
  }
  if (/^07\d{8}$/.test(digits)) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`
  }
  return digits
}

/**
 * A phone number as a `tel:` link wants it: every separator dropped, so the dialer
 * gets digits rather than the spaces a display shape carries.
 * @param value The number as the record carries it.
 * @returns The number with nothing but digits, and a leading + where there is one.
 */
export function dialablePhoneNumber(value: string): string {
  return value.replaceAll(separators, "")
}
