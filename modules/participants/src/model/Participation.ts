/**
 * How someone travels to the jamboree. A closed set, like the roles – the registration
 * offers exactly these three, and the contingent management travels outside them.
 */
export type Travel = "rundresa" | "direktresa" | "egenResa"

/**
 * What a travel choice is called in Swedish.
 * @param travel The travel choice to name.
 * @returns The Swedish label.
 */
export function travelName(travel: Travel): string {
  switch (travel) {
    case "rundresa": {
      return "Rundresa"
    }
    case "direktresa": {
      return "Direktresa"
    }
    case "egenResa": {
      return "Egen resa"
    }
  }
}

/**
 * The function a contingent management member serves in. The contingent's own roster
 * maps member numbers to these – the participants service mints it into the record's
 * roles, and the detail converter reads it back out of them.
 */
export type CmtFunktion =
  | "administration"
  | "program"
  | "halsosupport"
  | "avdelningssupport"
  | "istSupport"
  | "kommunikation"
  | "kontingentledare"

/**
 * What a funktion is called in Swedish.
 * @param funktion The funktion to name.
 * @returns The Swedish label.
 */
export function funktionName(funktion: CmtFunktion): string {
  switch (funktion) {
    case "administration": {
      return "Admin"
    }
    case "program": {
      return "Program"
    }
    case "halsosupport": {
      return "Hälsosupport"
    }
    case "avdelningssupport": {
      return "Avdelningssupport"
    }
    case "istSupport": {
      return "IST-support"
    }
    case "kommunikation": {
      return "Kommunikation"
    }
    case "kontingentledare": {
      return "HoC"
    }
  }
}
