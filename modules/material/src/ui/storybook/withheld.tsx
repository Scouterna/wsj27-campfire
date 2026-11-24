import type { WithheldSlot } from "../withheld-slot"

/**
 * What the participants section draws for a unit in the application, stood in for in the
 * stories, which have no list of participants to read – the words without its styling.
 * @returns Two names, whichever unit is asked about.
 */
export const twoSaidNo: WithheldSlot = () => (
  <div>
    <p>Bilder får inte publiceras på</p>
    <p>Ester Dahl, Molly Sundqvist</p>
  </div>
)
