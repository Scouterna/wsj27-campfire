import { Button } from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

export interface PhotoPromptProps {
  /**
   * Whether a photo is being decoded, which takes a moment for a large one off a phone.
   */
  readonly isReading: boolean
  /**
   * Fires when the reader asks to choose a photo.
   */
  readonly onChoose: () => void
}

/**
 * What the empty picture says before there is a photo: what the screen makes, the button
 * that chooses the photo, and the promise that it stays on the device.
 * @param props Whether a photo is being read, and what pressing does.
 * @returns The prompt.
 */
export function PhotoPrompt(props: PhotoPromptProps): ReactElement {
  return (
    <div className="frame-stage-choose">
      <div className="frame-stage-lead">
        <p>Här kan du skapa en bild till sociala medier.</p>
        <p>
          Börja med att välja en bild – sedan kan du sätta den i en av kontingentens ramar och
          skriva något på den.
        </p>
      </div>
      <div className="frame-stage-action">
        <Button
          disabled={props.isReading}
          label={props.isReading ? "Läser bilden …" : "Välj en bild"}
          onPress={props.onChoose}
        />
      </div>
      <p className="frame-stage-note">Bilden lämnar aldrig din enhet.</p>
    </div>
  )
}
