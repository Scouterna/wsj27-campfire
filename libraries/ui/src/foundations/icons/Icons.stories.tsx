import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement } from "react"

import type { IconProps } from "./IconProps"
import { BackIcon } from "./set/BackIcon"
import { ChatIcon } from "./set/ChatIcon"
import { CheckIcon } from "./set/CheckIcon"
import { CloseIcon } from "./set/CloseIcon"
import { CopyIcon } from "./set/CopyIcon"
import { DownloadIcon } from "./set/DownloadIcon"
import { FolderIcon } from "./set/FolderIcon"
import { GenderFemaleIcon } from "./set/GenderFemaleIcon"
import { GenderMaleIcon } from "./set/GenderMaleIcon"
import { GenderOtherIcon } from "./set/GenderOtherIcon"
import { HandIcon } from "./set/HandIcon"
import { HealthIcon } from "./set/HealthIcon"
import { HomeIcon } from "./set/HomeIcon"
import { IdCardIcon } from "./set/IdCardIcon"
import { ImageIcon } from "./set/ImageIcon"
import { LeafIcon } from "./set/LeafIcon"
import { MailIcon } from "./set/MailIcon"
import { MoreIcon } from "./set/MoreIcon"
import { ParticipantsIcon } from "./set/ParticipantsIcon"
import { PencilIcon } from "./set/PencilIcon"
import { PersonIcon } from "./set/PersonIcon"
import { PersonPlusIcon } from "./set/PersonPlusIcon"
import { PhoneIcon } from "./set/PhoneIcon"
import { PictureIcon } from "./set/PictureIcon"
import { PlusIcon } from "./set/PlusIcon"
import { RotateLeftIcon } from "./set/RotateLeftIcon"
import { RotateRightIcon } from "./set/RotateRightIcon"
import { SearchIcon } from "./set/SearchIcon"
import { SendIcon } from "./set/SendIcon"
import { TextLargerIcon } from "./set/TextLargerIcon"
import { TextSmallerIcon } from "./set/TextSmallerIcon"

const meta: Meta = {
  title: "Foundations/Icons",
}

export default meta

const icons: readonly (readonly [string, (props: IconProps) => ReactElement])[] = [
  ["Back", BackIcon],
  ["Chat", ChatIcon],
  ["Check", CheckIcon],
  ["Close", CloseIcon],
  ["Copy", CopyIcon],
  ["Download", DownloadIcon],
  ["Folder", FolderIcon],
  ["Gender female", GenderFemaleIcon],
  ["Gender male", GenderMaleIcon],
  ["Gender other", GenderOtherIcon],
  ["Hand", HandIcon],
  ["Health", HealthIcon],
  ["Home", HomeIcon],
  ["Id card", IdCardIcon],
  ["Image", ImageIcon],
  ["Leaf", LeafIcon],
  ["Mail", MailIcon],
  ["More", MoreIcon],
  ["Participants", ParticipantsIcon],
  ["Pencil", PencilIcon],
  ["Person", PersonIcon],
  ["Person plus", PersonPlusIcon],
  ["Phone", PhoneIcon],
  ["Picture", PictureIcon],
  ["Plus", PlusIcon],
  ["Rotate left", RotateLeftIcon],
  ["Rotate right", RotateRightIcon],
  ["Search", SearchIcon],
  ["Send", SendIcon],
  ["Text larger", TextLargerIcon],
  ["Text smaller", TextSmallerIcon],
]

/**
 * The whole set, at the 24-point size the grid is drawn on.
 */
export const All: StoryObj = {
  render: (): ReactElement => (
    <div className="story-icons">
      {icons.map(([name, Icon]) => (
        <div key={name} className="story-icon">
          <span className="story-icon-mark">
            <Icon />
          </span>
          <div className="story-icon-name">{name}</div>
        </div>
      ))}
    </div>
  ),
}

const samples: readonly { readonly size: number; readonly strokeWidth: number }[] = [
  { size: 16, strokeWidth: 2 },
  { size: 22, strokeWidth: 2 },
  { size: 22, strokeWidth: 2.4 },
  { size: 34, strokeWidth: 1.4 },
  { size: 48, strokeWidth: 2.1 },
]

/**
 * The knobs every icon carries – the size it draws itself at, and the weight of its
 * line – thickened where an icon is the active one, thinned where it sits behind text.
 */
export const SizeAndWeight: StoryObj = {
  render: (): ReactElement => (
    <div className="story-samples">
      {samples.map(({ size, strokeWidth }) => (
        <div key={`${String(size)}-${String(strokeWidth)}`} className="story-sample">
          <ParticipantsIcon size={size} strokeWidth={strokeWidth} />
          <div className="story-icon-name">
            {size} / {strokeWidth}
          </div>
        </div>
      ))}
    </div>
  ),
}
