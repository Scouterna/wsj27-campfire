/**
 * Nothing written or moved yet in a frame, shared so a frame left untouched keeps one
 * stable value and its picture is not redrawn on every key pressed in another.
 */
export const untouched: Readonly<Record<string, never>> = {}

/**
 * What a picture with no frame is kept under, where texts are kept by frame id.
 */
export const noFrame = "utan-ram"

/**
 * No texts added yet, shared for the same reason.
 */
export const noTexts: readonly never[] = []
