import type { Box, Frame, TextSlot } from "./Frame"

import bluePrimarram from "../../../assets/frames/blue/primarram.svg"
import blueStrykningar from "../../../assets/frames/blue/strykningar.svg"
import blueTrollslandan from "../../../assets/frames/blue/trollslandan.svg"
import brownPrimarram from "../../../assets/frames/brown/primarram.svg"
import brownStrykningar from "../../../assets/frames/brown/strykningar.svg"
import brownTrollslandan from "../../../assets/frames/brown/trollslandan.svg"
import greenPrimarram from "../../../assets/frames/green/primarram.svg"
import greenStrykningar from "../../../assets/frames/green/strykningar.svg"
import greenTrollslandan from "../../../assets/frames/green/trollslandan.svg"
import redPrimarram from "../../../assets/frames/red/primarram.svg"
import redStrykningar from "../../../assets/frames/red/strykningar.svg"
import redTrollslandan from "../../../assets/frames/red/trollslandan.svg"
import yellowPrimarram from "../../../assets/frames/yellow/primarram.svg"
import yellowStrykningar from "../../../assets/frames/yellow/strykningar.svg"
import yellowTrollslandan from "../../../assets/frames/yellow/trollslandan.svg"

/**
 * A box given by its middle, which is how the slots are measured off the artwork.
 * @param x the middle's distance from the left edge, as a share of the width
 * @param y the middle's distance from the top edge, as a share of the height
 * @param width the box's width, as a share of the picture's width
 * @param height the box's height, as a share of the picture's height
 * @returns The box.
 */
function centered(x: number, y: number, width: number, height: number): Box {
  return { height, width, x: x - width / 2, y: y - height / 2 }
}

/**
 * One line along a strip of the ribbon. The strips are the same width, so their text
 * tops out at the same size and the lines read as one message.
 * @param id the slot's name
 * @param label what its field is called
 * @param box where the strip's straight run is, before it is turned
 * @param angle how far the strip slants
 * @returns The slot.
 */
function strip(id: string, label: string, box: Box, angle: number): TextSlot {
  return { angle, box, id, isMovable: false, isMultiline: false, label, maxSize: 0.045 }
}

/**
 * The text a reader adds where the frame has no movable slot of its own, or there is no
 * frame at all: anywhere on the picture, in a block that starts in the middle, the way
 * the primary frame takes its text.
 */
export const freeSlot: TextSlot = {
  angle: 0,
  box: centered(0.5, 0.5, 0.8, 0.4),
  id: "fri",
  isMovable: true,
  isMultiline: true,
  label: "Text",
  maxSize: 0.09,
}

/**
 * The slot the texts a reader adds go in: the frame's own movable slot, or the free slot
 * for a frame without one and for no frame at all.
 * @param frame the chosen frame, or undefined for none
 * @returns The slot.
 */
export function addedSlotOf(frame: Frame | undefined): TextSlot {
  return frame?.slots.find((slot) => slot.isMovable) ?? freeSlot
}

/**
 * Which added texts a picture shows. No frame and a frame with a movable slot of its own
 * place text the same way, in the middle of the photo, so they share theirs; a frame
 * whose design sets its text in slots of its own keeps added texts of its own.
 * @param frame the chosen frame, or undefined for none
 * @returns The name the texts are kept under.
 */
export function addedTextsKeyOf(frame: Frame | undefined): string {
  return frame === undefined || frame.slots.some((slot) => slot.isMovable) ? freeSlot.id : frame.id
}

/**
 * Every frame the contingent's graphic profile offers, in the order they are shown.
 *
 * The artwork is imported rather than served from a folder, so the bundler names each
 * file and a frame that is deleted is a build error instead of a broken picture. The
 * slots are measured off that artwork, so a redrawn frame means measuring them again.
 */
export const frames: readonly Frame[] = [
  {
    id: "primarram",
    label: "Primärram",
    markBox: { height: 0.13, width: 0.2, x: 0.75, y: 0.83 },
    slots: [
      {
        angle: 0,
        box: centered(0.5, 0.5, 0.8, 0.4),
        id: "mitten",
        isMovable: true,
        isMultiline: true,
        label: "Text",
        maxSize: 0.09,
      },
    ],
    sources: {
      blue: bluePrimarram,
      brown: brownPrimarram,
      green: greenPrimarram,
      red: redPrimarram,
      yellow: yellowPrimarram,
    },
  },
  {
    id: "trollslandan",
    label: "Trollsländan",
    slots: [
      {
        angle: 0,
        box: centered(0.498, 0.835, 0.74, 0.14),
        id: "banderoll",
        isMovable: false,
        isMultiline: false,
        label: "Text",
        maxSize: 0.1,
      },
    ],
    sources: {
      blue: blueTrollslandan,
      brown: brownTrollslandan,
      green: greenTrollslandan,
      red: redTrollslandan,
      yellow: yellowTrollslandan,
    },
  },
  {
    id: "strykningar",
    label: "Strykningar",
    slots: [
      strip("rad-1", "Rad 1", centered(0.66, 0.244, 0.5, 0.045), -9.1),
      strip("rad-2", "Rad 2", centered(0.498, 0.458, 0.455, 0.045), -5.1),
      strip("rad-3", "Rad 3", centered(0.498, 0.52, 0.455, 0.045), -4.5),
      strip("rad-4", "Rad 4", centered(0.338, 0.736, 0.46, 0.045), -23),
    ],
    sources: {
      blue: blueStrykningar,
      brown: brownStrykningar,
      green: greenStrykningar,
      red: redStrykningar,
      yellow: yellowStrykningar,
    },
  },
]
